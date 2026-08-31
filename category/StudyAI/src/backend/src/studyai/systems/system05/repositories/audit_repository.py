from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system05.models.medical import System05AccessAuditLog


class AuditRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_log(
        self,
        *,
        actor_role: str,
        actor_id: str | None,
        action: str,
        target_type: str,
        target_id: str | int | None,
        result: str,
        detail: dict | None = None,
    ) -> System05AccessAuditLog:
        row = System05AccessAuditLog(
            actor_role=actor_role,
            actor_id=actor_id,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            result=result,
            detail=detail,
        )
        self.session.add(row)
        await self.session.flush()
        return row
