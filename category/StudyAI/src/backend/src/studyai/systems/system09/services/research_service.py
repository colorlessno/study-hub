from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.audit.logger import get_audit_logger
from studyai.common.errors.models import ConflictAppError, ValidationAppError
from studyai.systems.system09.graph.graph import ResearchGraphOrchestrator
from studyai.systems.system09.repositories.report_repository import ReportRepository
from studyai.systems.system09.schemas.research import (
    ReportDetailResponse,
    ReportExportResponse,
    ReportFilterParams,
    ReportListItem,
    ReportListResponse,
    ResearchRequest,
    ResearchResponse,
)
from studyai.systems.system09.services.export_service import ExportService
from studyai.systems.system09.services.query_generator import QueryGenerator
from studyai.systems.system09.services.report_composer import ReportComposer
from studyai.systems.system09.services.research_planner import ResearchPlanner
from studyai.common.search.source_evaluator import SourceEvaluator
from studyai.common.search.web_fetch_tool import WebFetchTool
from studyai.common.search.web_search_tool import WebSearchTool


class ResearchService:
    VALID_RESEARCH_TYPES = {"競合調査", "市場調査", "業界調査", "企業調査"}
    VALID_DEPTHS = {"overview", "standard", "detailed", "概要", "標準", "詳細"}
    SOURCE_LIMITS = {"overview": 4, "概要": 4, "standard": 6, "標準": 6, "detailed": 8, "詳細": 8}

    def __init__(self) -> None:
        self.planner = ResearchPlanner()
        self.query_generator = QueryGenerator()
        self.search_tool = WebSearchTool()
        self.fetch_tool = WebFetchTool()
        self.source_evaluator = SourceEvaluator()
        self.report_composer = ReportComposer()
        self.export_service = ExportService()
        self.graph_orchestrator = ResearchGraphOrchestrator(
            nodes=None,
        )
        self.audit_logger = get_audit_logger()

    async def run_research(
        self,
        session: AsyncSession,
        *,
        body: ResearchRequest,
        trace_id: str,
        user_id: str | None,
    ) -> ResearchResponse:
        state = await self.graph_orchestrator.run(
            session,
            body=body,
            trace_id=trace_id,
            user_id=user_id,
        )
        report = state["persisted_report"]
        report.markdown = self.export_service.export_markdown(report)
        await session.commit()
        self.audit_logger.log(
            action="system09.research.completed",
            trace_id=trace_id,
            user_id=user_id,
            resource_type="system09_report",
            resource_id=report.id,
            details={
                "research_type": body.research_type,
                "targets": body.targets,
                "search_count": int(report.search_count or 0),
            },
        )
        return self._to_response(report)

    async def list_reports(self, session: AsyncSession, filters: ReportFilterParams) -> ReportListResponse:
        reports = await ReportRepository(session).list_reports(
            research_type=filters.research_type,
            from_date=filters.from_date,
            to_date=filters.to_date,
        )
        if filters.target:
            keyword = filters.target.casefold()
            reports = [
                report
                for report in reports
                if any(keyword in target.casefold() for target in report.targets)
            ]
        return ReportListResponse(
            total=len(reports),
            items=[
                ReportListItem(
                    report_id=report.id,
                    research_type=report.research_type,
                    theme=report.theme,
                    targets=report.targets,
                    created_at=report.created_at,
                )
                for report in reports
            ],
        )

    async def get_report(self, session: AsyncSession, report_id: int) -> ReportDetailResponse:
        report = await ReportRepository(session).get_report(report_id)
        response = self._to_response(report)
        return ReportDetailResponse(**response.model_dump())

    async def export_report(self, session: AsyncSession, report_id: int) -> ReportExportResponse:
        report = await ReportRepository(session).get_report(report_id)
        content = self.export_service.export_markdown(report)
        return ReportExportResponse(report_id=report.id, format="markdown", content=content)

    def _validate_request(self, body: ResearchRequest) -> None:
        if body.research_type not in self.VALID_RESEARCH_TYPES:
            raise ValidationAppError("invalid_research_type", "research_type is not supported.")
        if not body.targets:
            raise ValidationAppError("invalid_targets", "At least one target is required.")
        if len(body.targets) > 5:
            raise ValidationAppError("too_many_targets", "Up to five targets are supported.")
        if body.depth not in self.VALID_DEPTHS:
            raise ValidationAppError("invalid_depth", "depth must be overview, standard, or detailed.")

    @staticmethod
    def _build_theme(body: ResearchRequest) -> str:
        if body.purpose and body.purpose.strip():
            return body.purpose.strip()
        return body.targets[0] if len(body.targets) == 1 else " / ".join(body.targets[:3])

    @staticmethod
    def _to_response(report) -> ResearchResponse:
        return ResearchResponse(
            report_id=report.id,
            research_type=report.research_type,
            targets=report.targets,
            executed_at=report.created_at,
            search_count=report.search_count,
            executive_summary=report.executive_summary or "",
            key_findings=report.key_findings,
            companies=report.companies,
            comparison_table=report.comparison_table,
            swot=report.swot,
            trends=report.trends or "",
            limitations=report.limitations or "",
            markdown=report.markdown or "",
            purpose=report.purpose,
            own_company=report.own_company or None,
            depth=report.depth,
            focus_areas=report.focus_areas,
        )
