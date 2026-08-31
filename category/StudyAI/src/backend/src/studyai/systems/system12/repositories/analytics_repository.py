from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system12.models.gift import System12Product, System12RecommendationLog, System12Session


class AnalyticsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def count_sessions(self) -> int:
        result = await self.session.execute(select(func.count()).select_from(System12Session))
        return int(result.scalar_one() or 0)

    async def list_logs(self) -> list[System12RecommendationLog]:
        result = await self.session.execute(select(System12RecommendationLog))
        return list(result.scalars().all())

    async def list_products_by_ids(self, product_ids: list[int]) -> list[System12Product]:
        if not product_ids:
            return []
        result = await self.session.execute(
            select(System12Product).where(System12Product.id.in_(product_ids))
        )
        return list(result.scalars().all())
