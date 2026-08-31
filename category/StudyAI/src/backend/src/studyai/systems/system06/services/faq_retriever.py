from __future__ import annotations

import math
import re
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.ai.embedding_client import EmbeddingClient
from studyai.common.errors.models import ExternalServiceError
from studyai.systems.system06.models.support import System06Faq
from studyai.systems.system06.repositories.faq_repository import FAQRepository


@dataclass(slots=True)
class RetrievedFAQ:
    faq: System06Faq
    keyword_score: float
    vector_score: float
    hybrid_score: float


class FAQRetriever:
    TOKEN_PATTERN = re.compile(r"[0-9A-Za-z_]+|[^\W\d_]{2,}", re.UNICODE)

    def __init__(self) -> None:
        self.embedding_client = EmbeddingClient()

    async def retrieve(self, session: AsyncSession, *, message: str, limit: int = 5) -> list[RetrievedFAQ]:
        faqs = await FAQRepository(session).list_active_faqs()
        if not faqs:
            return []
        embedding = await self._safe_embed(message)
        ranked = self.rank_records(message, embedding, faqs)
        return ranked[:limit]

    async def _safe_embed(self, message: str) -> list[float]:
        try:
            return (await self.embedding_client.embed([message]))[0]
        except ExternalServiceError:
            return []

    def rank_records(
        self,
        message: str,
        message_embedding: list[float],
        faqs: list[System06Faq],
    ) -> list[RetrievedFAQ]:
        ranked: list[RetrievedFAQ] = []
        for faq in faqs:
            target_text = "\n".join(part for part in [faq.title, faq.question, faq.answer] if part)
            keyword_score = self._keyword_score(message, target_text)
            vector_score = self._cosine_similarity(message_embedding, faq.embedding or [])
            hybrid_score = keyword_score * 0.45 + vector_score * 0.55 + min(faq.use_count * 0.01, 0.05)
            ranked.append(
                RetrievedFAQ(
                    faq=faq,
                    keyword_score=keyword_score,
                    vector_score=vector_score,
                    hybrid_score=hybrid_score,
                )
            )
        ranked.sort(key=lambda item: item.hybrid_score, reverse=True)
        return ranked

    def _keyword_score(self, message: str, text: str) -> float:
        message_tokens = {token.lower() for token in self.TOKEN_PATTERN.findall(message)}
        if not message_tokens:
            return 0.0
        text_tokens = {token.lower() for token in self.TOKEN_PATTERN.findall(text)}
        if not text_tokens:
            return 0.0
        return len(message_tokens & text_tokens) / len(message_tokens)

    @staticmethod
    def _cosine_similarity(left: list[float], right: list[float]) -> float:
        if not left or not right or len(left) != len(right):
            return 0.0
        numerator = sum(a * b for a, b in zip(left, right, strict=True))
        left_norm = math.sqrt(sum(a * a for a in left))
        right_norm = math.sqrt(sum(b * b for b in right))
        if left_norm == 0.0 or right_norm == 0.0:
            return 0.0
        return max(0.0, numerator / (left_norm * right_norm))
