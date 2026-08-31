from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system13.models.education import System13Member, System13Project


class MemberRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_optional(self, project_id: str, user_id: str) -> System13Member | None:
        result = await self.session.execute(
            select(System13Member).where(
                System13Member.project_id == project_id,
                System13Member.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_or_create(
        self,
        *,
        project_id: str,
        user_id: str,
        name: str | None = None,
        role: str | None = None,
        joined_at: date | None = None,
    ) -> System13Member:
        existing = await self.get_optional(project_id, user_id)
        if existing is not None:
            if role and not existing.role:
                existing.role = role
            if name and not existing.name:
                existing.name = name
            if joined_at and not existing.joined_at:
                existing.joined_at = joined_at
            await self.session.flush()
            return existing

        member = System13Member(
            project_id=project_id,
            user_id=user_id,
            name=name,
            role=role,
            joined_at=joined_at or date.today(),
        )
        self.session.add(member)
        await self.session.flush()
        await self._sync_project_snapshot(project_id)
        await self.session.refresh(member)
        return member

    async def list_members(self, project_id: str) -> list[System13Member]:
        result = await self.session.execute(
            select(System13Member)
            .where(System13Member.project_id == project_id)
            .order_by(System13Member.joined_at.asc().nullslast(), System13Member.id.asc())
        )
        return list(result.scalars().all())

    async def _sync_project_snapshot(self, project_id: str) -> None:
        result = await self.session.execute(
            select(System13Project).where(System13Project.id == project_id)
        )
        project = result.scalar_one_or_none()
        if project is None:
            return
        members = await self.list_members(project_id)
        project.members = [
            {
                "user_id": member.user_id,
                "name": member.name,
                "role": member.role,
            }
            for member in members
        ]
        await self.session.flush()
