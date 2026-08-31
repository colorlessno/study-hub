from __future__ import annotations

import asyncio

from studyai.common.ai.llm_client import LLMClient
from studyai.systems.system12.prompts.gift_prompt import RECOMMENDATION_REASON_PROMPT


class RecommendationAgent:
    def __init__(self) -> None:
        self.llm_client = LLMClient()

    async def build_recommendations(self, *, conditions: dict, candidates: list[dict]) -> list[dict]:
        top_candidates = candidates[:3]
        if not top_candidates:
            return []
        try:
            async with asyncio.timeout(10):
                llm_payload = await self.llm_client.extract_json(
                    RECOMMENDATION_REASON_PROMPT,
                    f"条件: {conditions}\n候補: {self._compact_candidates(top_candidates)}\nJSONで reasons 配列を返してください。",
                )
            reason_map = self._normalize_reason_payload(llm_payload)
        except Exception:
            reason_map = {}

        recommendations: list[dict] = []
        for rank, item in enumerate(top_candidates, start=1):
            product = item["product"]
            detail = reason_map.get(product.id, {})
            recommendations.append(
                {
                    "rank": rank,
                    "product_id": product.id,
                    "product_name": product.name,
                    "price": float(product.price),
                    "image_url": product.image_url,
                    "reason": detail.get("reason") or self._fallback_reason(product, conditions),
                    "suitable_for": detail.get("suitable_for") or self._fallback_suitable_for(product),
                    "cautions": detail.get("cautions") or self._fallback_cautions(item),
                    "wrapping": detail.get("wrapping") or "用途に合わせたラッピングを選べます。",
                    "score": round(float(item["score"]), 2),
                }
            )
        return recommendations

    @staticmethod
    def _compact_candidates(candidates: list[dict]) -> list[dict]:
        return [
            {
                "product_id": item["product"].id,
                "name": item["product"].name,
                "category": item["product"].category,
                "price": float(item["product"].price),
                "tags": item["product"].tags,
                "score": item["score"],
            }
            for item in candidates
        ]

    @staticmethod
    def _normalize_reason_payload(payload: dict) -> dict[int, dict]:
        items = payload.get("reasons")
        if not isinstance(items, list):
            return {}
        normalized: dict[int, dict] = {}
        for item in items:
            if not isinstance(item, dict):
                continue
            try:
                product_id = int(item.get("product_id"))
            except (TypeError, ValueError):
                continue
            normalized[product_id] = {
                "reason": str(item.get("reason") or "").strip() or None,
                "suitable_for": str(item.get("suitable_for") or "").strip() or None,
                "cautions": str(item.get("cautions") or "").strip() or None,
                "wrapping": str(item.get("wrapping") or "").strip() or None,
            }
        return normalized

    @staticmethod
    def _fallback_reason(product, conditions: dict) -> str:
        scene = conditions.get("scene") or "今回の用途"
        recipient = conditions.get("recipient") or "相手"
        return f"{scene} の {recipient} 向けとして条件に合いやすい商品です。"

    @staticmethod
    def _fallback_suitable_for(product) -> str:
        if product.suitable_recipients:
            return f"{'、'.join(product.suitable_recipients[:2])}向けとして使いやすいです。"
        return "幅広い相手に贈りやすい商品です。"

    @staticmethod
    def _fallback_cautions(item: dict) -> str | None:
        warnings = item.get("warnings") or []
        if warnings:
            return " / ".join(str(warning) for warning in warnings)
        return None
