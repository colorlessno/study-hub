from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system14.repositories.insight_repository import InsightRepository
from studyai.systems.system14.schemas.insight import (
    DummyCrmActivityCreate,
    DummyCrmActivityListResponse,
    DummyCrmActivityResponse,
    DummyCrmActivityUpdate,
    DummyCrmUpsertResponse,
)


class DummyCrmService:
    async def upsert_activity(
        self,
        session: AsyncSession,
        *,
        body: DummyCrmActivityCreate,
    ) -> DummyCrmUpsertResponse:
        row, created = await InsightRepository(session).upsert_dummy_crm_activity(
            values=body.model_dump(mode="python")
        )
        await session.commit()
        return DummyCrmUpsertResponse(
            created=created,
            activity=DummyCrmActivityResponse.model_validate(row),
        )

    async def get_activity(
        self,
        session: AsyncSession,
        *,
        activity_id: int,
    ) -> DummyCrmActivityResponse:
        row = await InsightRepository(session).get_dummy_crm_activity(activity_id)
        return DummyCrmActivityResponse.model_validate(row)

    async def list_activities(
        self,
        session: AsyncSession,
        *,
        status: str | None,
        limit: int,
    ) -> DummyCrmActivityListResponse:
        rows = await InsightRepository(session).list_dummy_crm_activities(
            status=status,
            limit=limit,
        )
        return DummyCrmActivityListResponse(
            activities=[DummyCrmActivityResponse.model_validate(row) for row in rows]
        )

    async def update_activity(
        self,
        session: AsyncSession,
        *,
        activity_id: int,
        body: DummyCrmActivityUpdate,
    ) -> DummyCrmActivityResponse:
        row = await InsightRepository(session).update_dummy_crm_activity(
            activity_id,
            values=body.model_dump(exclude_unset=True, mode="python"),
        )
        await session.commit()
        return DummyCrmActivityResponse.model_validate(row)
