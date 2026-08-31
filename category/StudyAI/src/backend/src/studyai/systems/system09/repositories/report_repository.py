from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.errors.models import NotFoundAppError
from studyai.systems.system09.models.report import System09Report


class ReportRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_report(self, **values) -> System09Report:
        report = System09Report(**values)
        self.session.add(report)
        await self.session.flush()
        await self.session.refresh(report)
        return report

    async def get_report(self, report_id: int) -> System09Report:
        result = await self.session.execute(
            select(System09Report).where(System09Report.id == report_id)
        )
        report = result.scalar_one_or_none()
        if report is None:
            raise NotFoundAppError("report_not_found", "The report was not found.")
        return report

    async def list_reports(
        self,
        *,
        research_type: str | None = None,
        from_date=None,
        to_date=None,
    ) -> list[System09Report]:
        stmt = select(System09Report)
        if research_type:
            stmt = stmt.where(System09Report.research_type == research_type)
        if from_date:
            stmt = stmt.where(System09Report.created_at >= from_date)
        if to_date:
            stmt = stmt.where(System09Report.created_at <= to_date)
        stmt = stmt.order_by(desc(System09Report.created_at), desc(System09Report.id))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    def build_target_normalized_key(targets: list[str]) -> str:
        normalized = sorted({target.strip().casefold() for target in targets if target.strip()})
        return "|".join(normalized)
