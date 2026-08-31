from __future__ import annotations

import asyncio
import math
import re

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.ai.embedding_client import EmbeddingClient
from studyai.systems.system12.repositories.product_repository import ProductRepository


class SearchAgent:
    TOKEN_PATTERN = re.compile(r"[0-9A-Za-z_]+|[^\W\d_]{2,}", re.UNICODE)

    def __init__(self) -> None:
        self.embedding_client = EmbeddingClient()

    async def search_candidates(self, session: AsyncSession, *, conditions: dict) -> list[dict]:
        products = await ProductRepository(session).list_active_products()
        if not products:
            return []

        query_text = self._build_query_text(conditions)
        query_embedding: list[float] | None = None
        if query_text.strip():
            try:
                async with asyncio.timeout(5):
                    query_embedding = (await self.embedding_client.embed([query_text]))[0]
            except Exception:
                query_embedding = None

        results: list[dict] = []
        for product in products:
            score = self._score_product(product, conditions, query_text, query_embedding)
            if score <= 0:
                continue
            results.append({"product": product, "score": round(score, 4)})
        results.sort(key=lambda item: (item["score"], item["product"].purchase_count, item["product"].id), reverse=True)
        return results[:10]

    def _score_product(self, product, conditions: dict, query_text: str, query_embedding: list[float] | None) -> float:
        score = 0.0
        budget = conditions.get("budget")
        if budget is not None:
            if float(product.price) > float(budget):
                return 0.0
            score += 1.2

        scene = str(conditions.get("scene") or "").strip()
        if scene:
            if scene in (product.suitable_scenes or []):
                score += 1.4
            elif product.suitable_scenes:
                score -= 0.2

        recipient = str(conditions.get("recipient") or "").strip()
        if recipient:
            if recipient in (product.suitable_recipients or []):
                score += 1.4
            elif product.suitable_recipients:
                score -= 0.2

        preference = str(conditions.get("preference") or "").strip()
        if preference:
            score += self._keyword_score(preference, product) * 1.5

        score += self._keyword_score(query_text, product) * 1.2
        if query_embedding and product.embedding:
            score += self._cosine_similarity(query_embedding, product.embedding) * 1.4

        if product.formality and conditions.get("scene"):
            score += 0.1
        score += min(int(product.purchase_count or 0), 20) / 100.0
        return score

    def _keyword_score(self, query_text: str, product) -> float:
        query_tokens = {token.lower() for token in self.TOKEN_PATTERN.findall(query_text)}
        if not query_tokens:
            return 0.0
        corpus = "\n".join(
            [
                product.name or "",
                product.category or "",
                product.description or "",
                " ".join(product.tags or []),
                " ".join(product.suitable_scenes or []),
                " ".join(product.suitable_recipients or []),
                " ".join(str(value) for value in (product.attributes or {}).values()),
            ]
        )
        product_tokens = {token.lower() for token in self.TOKEN_PATTERN.findall(corpus)}
        if not product_tokens:
            return 0.0
        return len(query_tokens & product_tokens) / len(query_tokens)

    @staticmethod
    def _build_query_text(conditions: dict) -> str:
        return " ".join(
            str(conditions.get(key) or "")
            for key in ["scene", "recipient", "preference", "ng_items"]
            if conditions.get(key)
        )

    @staticmethod
    def _cosine_similarity(left: list[float], right: list[float]) -> float:
        if not left or not right or len(left) != len(right):
            return 0.0
        numerator = sum(a * b for a, b in zip(left, right, strict=True))
        left_norm = math.sqrt(sum(a * a for a in left))
        right_norm = math.sqrt(sum(b * b for b in right))
        if left_norm == 0 or right_norm == 0:
            return 0.0
        return max(0.0, numerator / (left_norm * right_norm))
