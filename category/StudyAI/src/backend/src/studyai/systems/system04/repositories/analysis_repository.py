from __future__ import annotations

from datetime import date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from studyai.common.errors.models import NotFoundAppError
from studyai.systems.system04.models.analysis import System04Analysis, System04ReviewResult


class AnalysisRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_analysis(
        self,
        *,
        product_name: str,
        total_reviews: int,
        sentiment_summary: dict,
        topics: list[dict],
        insights: dict,
        compare_flag: bool = False,
        comparison_payload: dict | None = None,
    ) -> System04Analysis:
        analysis = System04Analysis(
            product_name=product_name,
            total_reviews=total_reviews,
            sentiment_summary=sentiment_summary,
            topics=topics,
            insights=insights,
            compare_flag=compare_flag,
            comparison_payload=comparison_payload or {},
        )
        self.session.add(analysis)
        await self.session.flush()
        await self.session.refresh(analysis)
        return analysis

    async def create_review_results(self, analysis_id: int, review_results: list[dict]) -> list[System04ReviewResult]:
        rows: list[System04ReviewResult] = []
        for item in review_results:
            row = System04ReviewResult(
                analysis_id=analysis_id,
                source_id=item.get("source_id"),
                product_name=item.get("product_name"),
                review_score=item.get("review_score"),
                review_date=item.get("review_date"),
                review_excerpt=item["text"],
                sentiment=item["sentiment"],
                sentiment_score=item["sentiment_score"],
                intensity=item["intensity"],
                topics=item.get("topics", []),
            )
            self.session.add(row)
            rows.append(row)
        await self.session.flush()
        return rows

    async def list_analyses(
        self,
        *,
        product_name: str | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> list[System04Analysis]:
        stmt = select(System04Analysis).order_by(
            System04Analysis.created_at.desc(),
            System04Analysis.id.desc(),
        )
        if product_name:
            stmt = stmt.where(System04Analysis.product_name.ilike(f"%{product_name}%"))
        if from_date:
            stmt = stmt.where(System04Analysis.created_at >= datetime.combine(from_date, time.min))
        if to_date:
            stmt = stmt.where(System04Analysis.created_at < datetime.combine(to_date + timedelta(days=1), time.min))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_analysis(self, analysis_id: int) -> System04Analysis:
        result = await self.session.execute(
            select(System04Analysis)
            .options(selectinload(System04Analysis.review_results))
            .where(System04Analysis.id == analysis_id)
            .execution_options(populate_existing=True)
        )
        analysis = result.scalar_one_or_none()
        if analysis is None:
            raise NotFoundAppError("analysis_not_found", "The analysis was not found.")
        return analysis
