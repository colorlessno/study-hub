from __future__ import annotations

from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system12.repositories.analytics_repository import AnalyticsRepository
from studyai.systems.system12.schemas.gift import RecommendationAnalyticsItem, RecommendationAnalyticsResponse


class AnalyticsService:
    async def get_recommendation_analytics(self, session: AsyncSession) -> RecommendationAnalyticsResponse:
        repository = AnalyticsRepository(session)
        logs = await repository.list_logs()
        total_sessions = await repository.count_sessions()

        counts: dict[int, dict] = {}
        for log in logs:
            recommended = list(log.recommended or [])
            feedback = dict(log.feedback or {})
            selected_product_id = feedback.get("selected_product_id")
            liked = feedback.get("liked")
            for item in recommended:
                try:
                    product_id = int(item.get("product_id"))
                except (TypeError, ValueError):
                    continue
                stats = counts.setdefault(
                    product_id,
                    {"recommendation_count": 0, "positive_feedback_count": 0, "negative_feedback_count": 0},
                )
                stats["recommendation_count"] += 1
                if selected_product_id == product_id and liked is True:
                    stats["positive_feedback_count"] += 1
                elif selected_product_id == product_id and liked is False:
                    stats["negative_feedback_count"] += 1

        products = await repository.list_products_by_ids(list(counts.keys()))
        product_map = {product.id: product for product in products}
        items = [
            RecommendationAnalyticsItem(
                product_id=product_id,
                product_name=product_map[product_id].name if product_id in product_map else f"Product {product_id}",
                recommendation_count=stats["recommendation_count"],
                positive_feedback_count=stats["positive_feedback_count"],
                negative_feedback_count=stats["negative_feedback_count"],
            )
            for product_id, stats in sorted(
                counts.items(),
                key=lambda item: (item[1]["recommendation_count"], item[0]),
                reverse=True,
            )
        ]
        return RecommendationAnalyticsResponse(
            total_sessions=total_sessions,
            total_recommendations=sum(item.recommendation_count for item in items),
            items=items,
            generated_at=datetime.now(),
        )
