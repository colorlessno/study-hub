from __future__ import annotations

import json

import httpx

from studyai.common.ai.models import JSONExtractionResult
from studyai.common.config.settings import get_settings
from studyai.common.errors.models import ExternalServiceError


class VLMClient:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def extract_json(self, system_prompt: str, user_prompt: str, image_urls: list[str]) -> dict:
        return (await self.extract_json_with_metadata(system_prompt, user_prompt, image_urls)).data

    async def extract_json_with_metadata(
        self,
        system_prompt: str,
        user_prompt: str,
        image_urls: list[str],
        *,
        model: str | None = None,
    ) -> JSONExtractionResult:
        requested_model = model or self.settings.get_vlm_model()
        content = [{"type": "text", "text": user_prompt}]
        content.extend({"type": "image_url", "image_url": {"url": image_url}} for image_url in image_urls)
        payload = {
            "model": requested_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": content},
            ],
            "temperature": 0,
        }
        try:
            async with httpx.AsyncClient(timeout=self.settings.model_timeout_seconds) as client:
                response = await client.post(
                    f"{self.settings.get_ai_base_url()}/chat/completions",
                    headers=self.settings.get_ai_headers(),
                    json=payload,
                )
                response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise ExternalServiceError("model_timeout", "VLM 呼び出しがタイムアウトしました。") from exc
        except httpx.HTTPError as exc:
            raise ExternalServiceError("vlm_request_failed", "VLM 呼び出しに失敗しました。", 502) from exc

        response_payload = response.json()
        content = response_payload["choices"][0]["message"]["content"]
        usage = response_payload.get("usage", {})
        try:
            data = self._parse_json(content)
        except json.JSONDecodeError as exc:
            raise ExternalServiceError(
                "invalid_model_output",
                "VLM の出力が JSON ではありません。",
                422,
                {
                    "raw_output": content,
                    "input_tokens": usage.get("prompt_tokens"),
                    "output_tokens": usage.get("completion_tokens"),
                },
            ) from exc
        return JSONExtractionResult(
            data=data,
            raw_output=content,
            input_tokens=usage.get("prompt_tokens"),
            output_tokens=usage.get("completion_tokens"),
            response_model=response_payload.get("model", requested_model),
        )

    @staticmethod
    def _parse_json(content: str) -> dict:
        import re
        # Markdownコードブロックを除去
        content = re.sub(r"```(?:json)?\s*", "", content).strip()
        # 先頭の { または [ を起点に JSON 部分だけ抽出
        match = re.search(r"[{\[]", content)
        if match:
            content = content[match.start():]
        return json.loads(content)
