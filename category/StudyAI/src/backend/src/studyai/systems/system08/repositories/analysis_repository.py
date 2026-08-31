from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from studyai.common.errors.models import NotFoundAppError
from studyai.systems.system08.models.analysis import System08Analysis, System08Task


class AnalysisRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_analysis(
        self,
        *,
        theme: str,
        background: str | None,
        current_status: str | None,
        constraints: str | None,
        role: str | None,
        depth: str,
        output_format: str,
    ) -> System08Analysis:
        analysis = System08Analysis(
            theme=theme,
            background=background,
            current_status=current_status,
            constraints=constraints,
            role=role,
            depth=depth,
            output_format=output_format,
            status="researching",
        )
        self.session.add(analysis)
        await self.session.flush()
        await self.session.refresh(analysis)
        return analysis

    async def get_analysis(self, analysis_id: int) -> System08Analysis:
        result = await self.session.execute(
            select(System08Analysis)
            .options(selectinload(System08Analysis.tasks))
            .where(System08Analysis.id == analysis_id)
        )
        analysis = result.scalar_one_or_none()
        if analysis is None:
            raise NotFoundAppError("analysis_not_found", "The analysis could not be found.")
        return analysis

    async def list_analyses(self) -> list[System08Analysis]:
        result = await self.session.execute(
            select(System08Analysis)
            .options(selectinload(System08Analysis.tasks))
            .order_by(System08Analysis.created_at.desc(), System08Analysis.id.desc())
        )
        return list(result.scalars().all())

    async def replace_tasks(self, analysis_id: int, tasks: list[dict]) -> System08Analysis:
        analysis = await self.get_analysis(analysis_id)
        analysis.tasks = [
            System08Task(
                task_no=int(item["task_no"]),
                name=str(item["name"]),
                description=str(item["description"]),
                category=item.get("category"),
                priority=str(item["priority"]),
                urgency=item.get("urgency"),
                importance=item.get("importance"),
                quadrant=item.get("quadrant"),
                dependencies=list(item.get("dependencies", [])),
                estimated_hours=item.get("estimated_hours"),
                assignee_skill=item.get("assignee_skill"),
                cautions=item.get("cautions"),
                references=list(item.get("references", [])),
                confidence=item.get("confidence"),
                evidence=list(item.get("evidence", [])),
                status=str(item.get("status", "todo")),
                note=item.get("note"),
            )
            for item in tasks
        ]
        await self.session.flush()
        await self.session.refresh(analysis)
        return analysis

    async def complete_analysis(
        self,
        analysis_id: int,
        *,
        search_count: int,
        search_queries: list[str],
        sources_json: list[dict],
        summary: str,
        priority_summary: dict,
        markdown: str,
        total_tasks: int,
        total_estimated_hours: float,
    ) -> System08Analysis:
        analysis = await self.get_analysis(analysis_id)
        analysis.search_count = search_count
        analysis.search_queries = search_queries
        analysis.sources_json = sources_json
        analysis.summary = summary
        analysis.priority_summary = priority_summary
        analysis.markdown = markdown
        analysis.total_tasks = total_tasks
        analysis.total_estimated_hours = total_estimated_hours
        analysis.status = "completed"
        await self.session.flush()
        await self.session.refresh(analysis)
        return analysis

    async def update_task_status(
        self,
        *,
        analysis_id: int,
        task_id: int,
        status: str,
        note: str | None,
    ) -> System08Task:
        analysis = await self.get_analysis(analysis_id)
        task = next((item for item in analysis.tasks if item.id == task_id), None)
        if task is None:
            raise NotFoundAppError("task_not_found", "The task could not be found.")
        task.status = status
        task.note = note
        await self.session.flush()
        await self.session.refresh(task)
        return task
