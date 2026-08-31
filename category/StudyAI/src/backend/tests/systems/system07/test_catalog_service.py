from __future__ import annotations

import asyncio

from studyai.common.errors.models import ExternalServiceError
from studyai.systems.system07.services.catalog_service import CatalogService


class FailingEmbeddingClient:
    async def embed(self, texts: list[str]) -> list[list[float]]:
        raise ExternalServiceError("embedding_request_failed", "Embedding 呼び出しに失敗しました。", 502)


def test_embedding_api_failure_uses_deterministic_local_vectors() -> None:
    service = CatalogService()
    service.embedding_client = FailingEmbeddingClient()

    first = asyncio.run(service._embed_texts(["FastAPIでAPI設計を学ぶ"]))
    second = asyncio.run(service._embed_texts(["FastAPIでAPI設計を学ぶ"]))

    assert first == second
    assert len(first) == 1
    assert len(first[0]) == 768
    assert any(value != 0 for value in first[0])


def test_local_vectors_rank_related_text_above_unrelated_text() -> None:
    service = CatalogService()
    query = service._local_embedding("FastAPIのAPI設計")
    related = service._local_embedding("FastAPIを使ったAPI設計と認証を確認する")
    unrelated = service._local_embedding("売上集計の表計算とグラフ作成")

    related_score = service.similarity_engine._cosine_similarity(query, related)
    unrelated_score = service.similarity_engine._cosine_similarity(query, unrelated)

    assert related_score > unrelated_score
