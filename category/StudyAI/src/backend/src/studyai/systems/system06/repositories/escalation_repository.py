from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system06.models.support import System06Escalation


class EscalationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_escalation(
        self,
        *,
        inquiry_id: int,
        assignee: str | None,
        reason: str,
        recommendation: str | None,
    ) -> System06Escalation:
        escalation = System06Escalation(
            inquiry_id=inquiry_id,
            assignee=assignee,
            reason=reason,
            recommendation=recommendation,
            notified_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        self.session.add(escalation)
        await self.session.flush()
        await self.session.refresh(escalation)
        return escalation

    async def get_by_inquiry_id(self, inquiry_id: int) -> System06Escalation | None:
        result = await self.session.execute(
            select(System06Escalation).where(System06Escalation.inquiry_id == inquiry_id)
        )
        return result.scalar_one_or_none()
