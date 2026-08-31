from __future__ import annotations

from studyai.common.ai.embedding_client import EmbeddingClient
from studyai.systems.system16.repositories.match_repository import MatchRepository


class PastCaseRetriever:
    def __init__(self) -> None:
        self.embedding_client = EmbeddingClient()

    async def retrieve_cases(
        self,
        session,
        *,
        requirement_text: str,
        candidate_profile_summary: str,
        limit: int = 3,
    ) -> list[dict]:
        repository = MatchRepository(session)
        records = await repository.list_past_cases(limit=100)
        if not records:
            return []

        query_text = f"{requirement_text}\n{candidate_profile_summary}"
        query_embedding = await self._try_embed(query_text)
        query_tokens = self._tokenize(query_text)
        scored = []
        for record in records:
            if query_embedding is not None and record.embedding:
                similarity = self._cosine_similarity(query_embedding, record.embedding)
            else:
                record_tokens = self._tokenize(
                    f"{record.requirement_summary}\n{record.candidate_profile or ''}\n{record.notes or ''}"
                )
                similarity = self._token_overlap(query_tokens, record_tokens)
            scored.append((similarity, record))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [
            {
                "summary": record.requirement_summary,
                "similarity_score": round(float(similarity), 3),
                "result": record.result,
                "notes": record.notes,
            }
            for similarity, record in scored[:limit]
        ]

    async def _try_embed(self, text: str) -> list[float] | None:
        try:
            return (await self.embedding_client.embed([text]))[0]
        except Exception:
            return None

    @staticmethod
    def _tokenize(text: str) -> set[str]:
        return {token.casefold() for token in text.replace("\n", " ").split() if len(token) >= 2}

    @staticmethod
    def _token_overlap(query_tokens: set[str], record_tokens: set[str]) -> float:
        if not query_tokens or not record_tokens:
            return 0.0
        return len(query_tokens & record_tokens) / max(len(query_tokens), 1)

    @staticmethod
    def _cosine_similarity(left: list[float], right: list[float]) -> float:
        if not left or not right or len(left) != len(right):
            return 0.0
        numerator = sum(a * b for a, b in zip(left, right, strict=True))
        left_norm = sum(a * a for a in left) ** 0.5
        right_norm = sum(b * b for b in right) ** 0.5
        if left_norm == 0 or right_norm == 0:
            return 0.0
        return numerator / (left_norm * right_norm)
