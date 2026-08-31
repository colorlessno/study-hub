from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.audit.logger import get_audit_logger
from studyai.common.errors.models import ValidationAppError
from studyai.systems.system08.graph.graph import AnalysisGraphOrchestrator
from studyai.systems.system08.repositories.analysis_repository import AnalysisRepository
from studyai.systems.system08.schemas.analysis import (
    AnalysisCreateRequest,
    AnalysisExportResponse,
    AnalysisListItem,
    AnalysisListResponse,
    AnalysisResponse,
    PrioritySummaryResponse,
    TaskReference,
    TaskResponse,
    TaskStatusUpdateRequest,
    TaskStatusUpdateResponse,
)
from studyai.systems.system08.services.export_service import ExportService


class AnalysisService:
    VALID_DEPTHS = {"概要レベル", "標準レベル", "詳細レベル"}
    VALID_EXPORT_FORMATS = {"markdown", "csv", "json"}
    VALID_TASK_STATUS = {"todo", "doing", "done"}

    def __init__(self) -> None:
        self.export_service = ExportService()
        self.graph_orchestrator = AnalysisGraphOrchestrator()
        self.audit_logger = get_audit_logger()

    async def start_analysis(
        self,
        session: AsyncSession,
        *,
        body: AnalysisCreateRequest,
        trace_id: str,
        user_id: str | None,
    ) -> AnalysisResponse:
        state = await self.graph_orchestrator.run(
            session,
            body=body,
            trace_id=trace_id,
            user_id=user_id,
        )
        analysis = state["persisted_analysis"]
        await session.commit()

        self.audit_logger.log(
            action="system08.analysis.completed",
            trace_id=trace_id,
            user_id=user_id,
            resource_type="system08_analysis",
            resource_id=analysis.id,
            details={
                "theme": body.theme,
                "search_count": int(analysis.search_count or 0),
                "task_count": int(analysis.total_tasks or 0),
            },
        )
        return self._to_analysis_response(analysis)

    async def list_analyses(self, session: AsyncSession) -> AnalysisListResponse:
        analyses = await AnalysisRepository(session).list_analyses()
        return AnalysisListResponse(
            total=len(analyses),
            items=[
                AnalysisListItem(
                    analysis_id=analysis.id,
                    theme=analysis.theme,
                    status=analysis.status,
                    search_count=analysis.search_count,
                    total_tasks=analysis.total_tasks,
                    created_at=analysis.created_at,
                )
                for analysis in analyses
            ],
        )

    async def get_analysis(self, session: AsyncSession, analysis_id: int) -> AnalysisResponse:
        analysis = await AnalysisRepository(session).get_analysis(analysis_id)
        return self._to_analysis_response(analysis)

    async def update_task_status(
        self,
        session: AsyncSession,
        *,
        analysis_id: int,
        task_id: int,
        body: TaskStatusUpdateRequest,
        trace_id: str,
        user_id: str | None,
    ) -> TaskStatusUpdateResponse:
        status = body.status.strip().lower()
        if status not in self.VALID_TASK_STATUS:
            raise ValidationAppError("invalid_task_status", "status must be todo, doing, or done.")
        task = await AnalysisRepository(session).update_task_status(
            analysis_id=analysis_id,
            task_id=task_id,
            status=status,
            note=body.note,
        )
        await session.commit()
        self.audit_logger.log(
            action="system08.task.updated",
            trace_id=trace_id,
            user_id=user_id,
            resource_type="system08_task",
            resource_id=task.id,
            details={"analysis_id": analysis_id, "status": status},
        )
        return TaskStatusUpdateResponse(
            analysis_id=analysis_id,
            task_id=task.id,
            status=task.status,
            note=task.note,
        )

    async def export_analysis(
        self,
        session: AsyncSession,
        *,
        analysis_id: int,
        format: str,
    ) -> AnalysisExportResponse:
        export_format = format.strip().lower()
        if export_format not in self.VALID_EXPORT_FORMATS:
            raise ValidationAppError("invalid_export_format", "format must be markdown, csv, or json.")
        analysis = await AnalysisRepository(session).get_analysis(analysis_id)
        if export_format == "markdown":
            content = analysis.markdown or self.export_service.export_markdown(analysis)
        elif export_format == "csv":
            content = self.export_service.export_csv(analysis)
        else:
            content = self.export_service.export_json(analysis)
        return AnalysisExportResponse(
            analysis_id=analysis.id,
            format=export_format,
            content=content,
        )

    def _to_analysis_response(self, analysis) -> AnalysisResponse:
        tasks = [
            TaskResponse(
                task_id=task.id,
                task_no=task.task_no,
                name=task.name,
                description=task.description,
                category=task.category,
                priority=task.priority,
                urgency=task.urgency,
                importance=task.importance,
                quadrant=task.quadrant,
                dependencies=list(task.dependencies or []),
                estimated_hours=float(task.estimated_hours) if task.estimated_hours is not None else None,
                assignee_skill=task.assignee_skill,
                cautions=task.cautions,
                references=[
                    TaskReference(title=str(item.get("title")), url=str(item.get("url")))
                    for item in (task.references or [])
                    if item.get("title") and item.get("url")
                ],
                confidence=task.confidence,
                status=task.status,
                note=task.note,
            )
            for task in analysis.tasks
        ]
        summary = analysis.priority_summary or {}
        return AnalysisResponse(
            analysis_id=analysis.id,
            theme=analysis.theme,
            search_count=analysis.search_count,
            search_queries=list(analysis.search_queries or []),
            tasks=tasks,
            priority_summary=PrioritySummaryResponse(
                quadrant_1=list(summary.get("quadrant_1", [])),
                quadrant_2=list(summary.get("quadrant_2", [])),
                quadrant_3=list(summary.get("quadrant_3", [])),
                quadrant_4=list(summary.get("quadrant_4", [])),
                recommended_order=list(summary.get("recommended_order", [])),
                first_week_tasks=list(summary.get("first_week_tasks", [])),
            ),
            markdown=analysis.markdown or "",
            total_tasks=analysis.total_tasks,
            total_estimated_hours=float(analysis.total_estimated_hours or 0),
            status=analysis.status,
            created_at=analysis.created_at,
        )
