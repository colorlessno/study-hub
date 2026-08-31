from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.errors.models import NotFoundAppError
from studyai.systems.system13.models.education import System13Project


class ProjectRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_optional(self, project_id: str) -> System13Project | None:
        result = await self.session.execute(
            select(System13Project).where(System13Project.id == project_id)
        )
        return result.scalar_one_or_none()

    async def get(self, project_id: str) -> System13Project:
        project = await self.get_optional(project_id)
        if project is None:
            raise NotFoundAppError("project_not_found", "Project was not found.")
        return project

    async def get_or_create(self, project_id: str, *, name: str | None = None) -> System13Project:
        existing = await self.get_optional(project_id)
        if existing is not None:
            return existing
        project = System13Project(id=project_id, name=name or project_id, tech_stack=[], members=[])
        self.session.add(project)
        await self.session.flush()
        await self.session.refresh(project)
        return project
