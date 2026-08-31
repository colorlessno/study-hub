from __future__ import annotations

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.errors.models import NotFoundAppError
from studyai.systems.system13.models.education import System13ChecklistItem


class ChecklistRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_items(self, *, project_id: str, user_id: str) -> list[System13ChecklistItem]:
        result = await self.session.execute(
            select(System13ChecklistItem)
            .where(
                System13ChecklistItem.project_id == project_id,
                System13ChecklistItem.user_id == user_id,
            )
            .order_by(System13ChecklistItem.due_days.asc().nullslast(), System13ChecklistItem.id.asc())
        )
        return list(result.scalars().all())

    async def bulk_create(self, items: list[dict[str, object]]) -> list[System13ChecklistItem]:
        created = [
            System13ChecklistItem(
                project_id=str(item["project_id"]),
                user_id=str(item["user_id"]),
                role=item.get("role"),
                title=str(item["title"]),
                category=str(item["category"]),
                status=str(item["status"]),
                due_days=int(item["due_days"]) if item.get("due_days") is not None else None,
            )
            for item in items
        ]
        self.session.add_all(created)
        await self.session.flush()
        return created

    async def update_status(
        self,
        *,
        project_id: str,
        user_id: str,
        item_id: int,
        status: str,
    ) -> System13ChecklistItem:
        result = await self.session.execute(
            select(System13ChecklistItem).where(
                System13ChecklistItem.project_id == project_id,
                System13ChecklistItem.user_id == user_id,
                System13ChecklistItem.id == item_id,
            )
        )
        item = result.scalar_one_or_none()
        if item is None:
            raise NotFoundAppError("checklist_item_not_found", "Checklist item was not found.")
        item.status = status
        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def progress_by_project(self, project_id: str) -> list[dict[str, object]]:
        completed = case((System13ChecklistItem.status == "completed", 1), else_=0)
        rows = await self.session.execute(
            select(
                System13ChecklistItem.user_id,
                System13ChecklistItem.role,
                func.count(System13ChecklistItem.id).label("total_count"),
                func.sum(completed).label("completed_count"),
            )
            .where(System13ChecklistItem.project_id == project_id)
            .group_by(System13ChecklistItem.user_id, System13ChecklistItem.role)
            .order_by(System13ChecklistItem.user_id.asc())
        )
        results: list[dict[str, object]] = []
        for row in rows:
            total_count = int(row.total_count)
            completed_count = int(row.completed_count or 0)
            rate = round(completed_count / total_count, 4) if total_count else 0.0
            results.append(
                {
                    "user_id": row.user_id,
                    "role": row.role or "member",
                    "total_count": total_count,
                    "completed_count": completed_count,
                    "progress_rate": rate,
                }
            )
        return results
