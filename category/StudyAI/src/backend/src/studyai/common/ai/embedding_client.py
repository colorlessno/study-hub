from __future__ import annotations

import httpx

from studyai.common.config.settings import get_settings
from studyai.common.errors.models import ExternalServiceError


class EmbeddingClient:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def embed(self, texts: list[str]) -> list[list[float]]:
        payload = {"model": self.settings.get_embedding_model(), "input": texts}
        try:
            async with httpx.AsyncClient(timeout=self.settings.model_timeout_seconds) as client:
                response = await client.post(
                    f"{self.settings.get_ai_base_url()}/embeddings",
                    headers=self.settings.get_ai_headers(),
                    json=payload,
                )
                response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise ExternalServiceError("embedding_timeout", "Embedding 呼び出しがタイムアウトしました。") from exc
        except httpx.HTTPError as exc:
            raise ExternalServiceError("embedding_request_failed", "Embedding 呼び出しに失敗しました。", 502) from exc

        return [item["embedding"] for item in response.json()["data"]]
