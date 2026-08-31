from __future__ import annotations

from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system13.models.education import System13Knowledge


class KnowledgeRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_knowledge(
        self,
        *,
        project_id: str,
        category: str,
        title: str,
        content: str,
        importance: str,
        is_landmine: bool,
        registered_by: str | None,
        source_type: str,
        embedding: list[float] | None,
    ) -> System13Knowledge:
        record = System13Knowledge(
            project_id=project_id,
            category=category,
            title=title,
            content=content,
            importance=importance,
            is_landmine=is_landmine,
            registered_by=registered_by,
            source_type=source_type,
            embedding=embedding,
            is_active=True,
        )
        self.session.add(record)
        await self.session.flush()
        await self.session.refresh(record)
        return record

    async def list_knowledge(
        self,
        *,
        project_id: str,
        category: str | None = None,
        importance: str | None = None,
        search: str | None = None,
        include_inactive: bool = False,
    ) -> tuple[int, list[System13Knowledge]]:
        stmt = select(System13Knowledge).where(System13Knowledge.project_id == project_id)
        count_stmt = (
            select(func.count())
            .select_from(System13Knowledge)
            .where(System13Knowledge.project_id == project_id)
        )
        if category:
            stmt = stmt.where(System13Knowledge.category == category)
            count_stmt = count_stmt.where(System13Knowledge.category == category)
        if importance:
            stmt = stmt.where(System13Knowledge.importance == importance)
            count_stmt = count_stmt.where(System13Knowledge.importance == importance)
        if search:
            pattern = f"%{search.strip()}%"
            condition = or_(
                System13Knowledge.title.ilike(pattern),
                System13Knowledge.content.ilike(pattern),
            )
            stmt = stmt.where(condition)
            count_stmt = count_stmt.where(condition)
        if not include_inactive:
            stmt = stmt.where(System13Knowledge.is_active.is_(True))
            count_stmt = count_stmt.where(System13Knowledge.is_active.is_(True))
        stmt = stmt.order_by(System13Knowledge.updated_at.desc(), System13Knowledge.id.desc())
        total = int((await self.session.execute(count_stmt)).scalar_one())
        items = list((await self.session.execute(stmt)).scalars().all())
        return total, items

    async def list_active_knowledge(self, project_id: str) -> list[System13Knowledge]:
        result = await self.session.execute(
            select(System13Knowledge)
            .where(
                System13Knowledge.project_id == project_id,
                System13Knowledge.is_active.is_(True),
            )
            .order_by(System13Knowledge.updated_at.desc(), System13Knowledge.id.desc())
        )
        return list(result.scalars().all())

    async def list_landmines(self, project_id: str, *, limit: int = 10) -> list[System13Knowledge]:
        result = await self.session.execute(
            select(System13Knowledge)
            .where(
                System13Knowledge.project_id == project_id,
                System13Knowledge.is_active.is_(True),
                System13Knowledge.is_landmine.is_(True),
            )
            .order_by(System13Knowledge.updated_at.desc(), System13Knowledge.id.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_high_priority(self, project_id: str, *, limit: int = 10) -> list[System13Knowledge]:
        priority_order = {"high": 3, "medium": 2, "low": 1}
        items = await self.list_active_knowledge(project_id)
        items.sort(
            key=lambda item: (priority_order.get(item.importance, 0), item.updated_at, item.id),
            reverse=True,
        )
        return items[:limit]

    async def category_counts(self, project_id: str) -> list[dict[str, object]]:
        rows = await self.session.execute(
            select(System13Knowledge.category, func.count(System13Knowledge.id).label("count"))
            .where(
                System13Knowledge.project_id == project_id,
                System13Knowledge.is_active.is_(True),
            )
            .group_by(System13Knowledge.category)
            .order_by(desc("count"), System13Knowledge.category)
        )
        return [{"category": row.category, "count": int(row.count)} for row in rows]
