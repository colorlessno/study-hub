from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system13.models.education import System13Session


class SessionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_or_create(self, session_id: str, project_id: str, user_id: str) -> System13Session:
        result = await self.session.execute(
            select(System13Session).where(System13Session.session_id == session_id)
        )
        found = result.scalar_one_or_none()
        if found is not None:
            if not found.project_id:
                found.project_id = project_id
            if not found.user_id:
                found.user_id = user_id
            return found

        created = System13Session(
            session_id=session_id,
            project_id=project_id,
            user_id=user_id,
            history=[],
        )
        self.session.add(created)
        await self.session.flush()
        await self.session.refresh(created)
        return created

    async def append_history(self, session_id: str, question: str, answer: str) -> System13Session:
        result = await self.session.execute(
            select(System13Session).where(System13Session.session_id == session_id)
        )
        session = result.scalar_one()
        history = list(session.history)
        history.append({"question": question, "answer": answer})
        session.history = history[-5:]
        await self.session.flush()
        await self.session.refresh(session)
        return session
