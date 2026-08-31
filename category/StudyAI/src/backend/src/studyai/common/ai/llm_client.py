from __future__ import annotations

import json

import httpx

from studyai.common.ai.models import JSONExtractionResult
from studyai.common.config.settings import get_settings
from studyai.common.errors.models import ExternalServiceError


class LLMClient:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def extract_json(self, system_prompt: str, user_prompt: str) -> dict:
        return (await self.extract_json_with_metadata(system_prompt, user_prompt)).data

    async def extract_json_with_metadata(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        max_tokens: int | None = None,
        reasoning_effort: str | None = None,
    ) -> JSONExtractionResult:
        payload = {
            "model": self.settings.get_llm_model(),
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens
        if reasoning_effort is not None:
            payload["reasoning_effort"] = reasoning_effort
        try:
            async with httpx.AsyncClient(timeout=self.settings.model_timeout_seconds) as client:
                response = await client.post(
                    f"{self.settings.get_ai_base_url()}/chat/completions",
                    headers=self.settings.get_ai_headers(),
                    json=payload,
                )
                response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise ExternalServiceError("model_timeout", "LLM 呼び出しがタイムアウトしました。") from exc
        except httpx.HTTPError as exc:
            raise ExternalServiceError("llm_request_failed", "LLM 呼び出しに失敗しました。", 502) from exc

        response_payload = response.json()
        content = response_payload["choices"][0]["message"]["content"]
        usage = response_payload.get("usage", {})
        try:
            data = self._parse_json(content)
        except json.JSONDecodeError as exc:
            raise ExternalServiceError(
                "invalid_model_output",
                "LLM の出力が JSON ではありません。",
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
        )

    async def generate_text_with_metadata(
        self,
        prompt: str,
        temperature: float,
        *,
        model: str | None = None,
        max_tokens: int | None = None,
    ) -> dict:
        requested_model = model or self.settings.get_llm_model()
        payload = {
            "model": requested_model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens
        try:
            async with httpx.AsyncClient(timeout=self.settings.model_timeout_seconds) as client:
                response = await client.post(
                    f"{self.settings.get_ai_base_url()}/chat/completions",
                    headers=self.settings.get_ai_headers(),
                    json=payload,
                )
                response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise ExternalServiceError("model_timeout", "LLM 呼び出しがタイムアウトしました。") from exc
        except httpx.HTTPError as exc:
            raise ExternalServiceError("llm_request_failed", "LLM 呼び出しに失敗しました。", 502) from exc

        response_payload = response.json()
        choice = response_payload["choices"][0]
        content = choice["message"]["content"]
        finish_reason = choice.get("finish_reason")
        if (not isinstance(content, str) or not content.strip()) and finish_reason != "length":
            raise ExternalServiceError("invalid_model_output", "LLM から文章が返されませんでした。", 422)
        usage = response_payload.get("usage", {})
        return {
            "text": content.strip() if isinstance(content, str) else "",
            "model": response_payload.get("model", requested_model),
            "input_tokens": usage.get("prompt_tokens"),
            "output_tokens": usage.get("completion_tokens"),
            "finish_reason": finish_reason,
        }

    @staticmethod
    def _parse_json(content: str) -> dict:
        import re
        content = re.sub(r"```(?:json)?\s*", "", content).strip()
        match = re.search(r"[{\[]", content)
        if match:
            content = content[match.start():]
        return json.loads(content)
