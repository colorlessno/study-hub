from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system03.models.document import System03Session


class SessionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_or_create(self, session_id: str, project_id: str, user_id: str) -> System03Session:
        result = await self.session.execute(
            select(System03Session).where(System03Session.session_id == session_id)
        )
        found = result.scalar_one_or_none()
        if found is not None:
            if not found.project_id:
                found.project_id = project_id
            if not found.user_id:
                found.user_id = user_id
            return found

        created = System03Session(
            session_id=session_id,
            project_id=project_id,
            user_id=user_id,
            short_memory=[],
        )
        self.session.add(created)
        await self.session.flush()
        await self.session.refresh(created)
        return created

    async def append_history(self, session_id: str, question: str, answer: str) -> System03Session:
        session = await self.get(session_id)
        history = list(session.short_memory)
        history.append({"question": question, "answer": answer})
        session.short_memory = history[-5:]
        await self.session.flush()
        await self.session.refresh(session)
        return session

    async def get(self, session_id: str) -> System03Session:
        result = await self.session.execute(
            select(System03Session).where(System03Session.session_id == session_id)
        )
        return result.scalar_one()
