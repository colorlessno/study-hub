from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system12.models.gift import System12RecommendationLog, System12Session


class SessionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_or_create(self, session_id: str) -> System12Session:
        result = await self.session.execute(
            select(System12Session).where(System12Session.session_id == session_id)
        )
        found = result.scalar_one_or_none()
        if found is not None:
            return found
        created = System12Session(
            session_id=session_id,
            collected_conditions={},
            recommended_ids=[],
            history=[],
        )
        self.session.add(created)
        await self.session.flush()
        await self.session.refresh(created)
        return created

    async def append_history(self, session_id: str, role: str, message: str) -> System12Session:
        session = await self.get_or_create(session_id)
        history = list(session.history or [])
        history.append({"role": role, "message": message})
        session.history = history[-10:]
        await self.session.flush()
        await self.session.refresh(session)
        return session

    async def update_conditions(self, session_id: str, conditions: dict) -> System12Session:
        session = await self.get_or_create(session_id)
        merged = dict(session.collected_conditions or {})
        for key, value in conditions.items():
            if value not in (None, "", [], {}):
                merged[key] = value
        session.collected_conditions = merged
        await self.session.flush()
        await self.session.refresh(session)
        return session

    async def update_recommendations(self, session_id: str, product_ids: list[int]) -> System12Session:
        session = await self.get_or_create(session_id)
        session.recommended_ids = product_ids
        await self.session.flush()
        await self.session.refresh(session)
        return session

    async def create_log(
        self,
        *,
        session_id: str,
        conditions: dict,
        recommended: list[dict],
        feedback: dict | None = None,
    ) -> System12RecommendationLog:
        log = System12RecommendationLog(
            session_id=session_id,
            conditions=conditions,
            recommended=recommended,
            feedback=feedback or {},
        )
        self.session.add(log)
        await self.session.flush()
        await self.session.refresh(log)
        return log

    async def append_feedback(self, *, session_id: str, feedback: dict) -> System12RecommendationLog | None:
        result = await self.session.execute(
            select(System12RecommendationLog)
            .where(System12RecommendationLog.session_id == session_id)
            .order_by(System12RecommendationLog.created_at.desc(), System12RecommendationLog.id.desc())
        )
        latest = result.scalars().first()
        if latest is None:
            return None
        merged = dict(latest.feedback or {})
        merged.update(feedback)
        latest.feedback = merged
        await self.session.flush()
        await self.session.refresh(latest)
        return latest
