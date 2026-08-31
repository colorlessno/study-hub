from __future__ import annotations

import math
import re
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.ai.embedding_client import EmbeddingClient
from studyai.systems.system13.models.education import System13Knowledge
from studyai.systems.system13.repositories.knowledge_repository import KnowledgeRepository


@dataclass(slots=True)
class RetrievedKnowledge:
    knowledge: System13Knowledge
    keyword_score: float
    vector_score: float
    hybrid_score: float


class KnowledgeRetriever:
    TOKEN_PATTERN = re.compile(r"[0-9A-Za-z_]+|[^\W\d_]{2,}", re.UNICODE)

    def __init__(self) -> None:
        self.embedding_client = EmbeddingClient()

    async def retrieve(
        self,
        session: AsyncSession,
        *,
        project_id: str,
        question: str,
        limit: int = 4,
    ) -> list[RetrievedKnowledge]:
        candidates = await KnowledgeRepository(session).list_active_knowledge(project_id)
        if not candidates:
            return []
        question_embedding = (await self.embedding_client.embed([question]))[0]
        ranked = self.rank_records(question, question_embedding, candidates)
        return ranked[:limit]

    def rank_records(
        self,
        question: str,
        question_embedding: list[float],
        candidates: list[System13Knowledge],
    ) -> list[RetrievedKnowledge]:
        ranked: list[RetrievedKnowledge] = []
        for knowledge in candidates:
            keyword_score = self._keyword_score(question, knowledge.content)
            vector_score = self._cosine_similarity(question_embedding, knowledge.embedding or [])
            hybrid_score = keyword_score * 0.35 + vector_score * 0.65
            if knowledge.importance == "high":
                hybrid_score += 0.05
            if knowledge.is_landmine:
                hybrid_score += 0.03
            ranked.append(
                RetrievedKnowledge(
                    knowledge=knowledge,
                    keyword_score=keyword_score,
                    vector_score=vector_score,
                    hybrid_score=hybrid_score,
                )
            )
        ranked.sort(key=lambda item: item.hybrid_score, reverse=True)
        return ranked

    def _keyword_score(self, question: str, content: str) -> float:
        question_tokens = {token.lower() for token in self.TOKEN_PATTERN.findall(question)}
        if not question_tokens:
            return 0.0
        content_tokens = {token.lower() for token in self.TOKEN_PATTERN.findall(content)}
        if not content_tokens:
            return 0.0
        matched = len(question_tokens & content_tokens)
        return matched / len(question_tokens)

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
