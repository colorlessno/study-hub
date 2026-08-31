from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system06.models.support import System06Session


class SessionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_or_create(self, session_id: str, user_id: str | None) -> System06Session:
        result = await self.session.execute(
            select(System06Session).where(System06Session.session_id == session_id)
        )
        found = result.scalar_one_or_none()
        if found is not None:
            if user_id and not found.user_id:
                found.user_id = user_id
            return found

        created = System06Session(session_id=session_id, user_id=user_id, history_json=[])
        self.session.add(created)
        await self.session.flush()
        await self.session.refresh(created)
        return created

    async def append_history(self, session_id: str, user_message: str, answer: str) -> System06Session:
        found = await self.get_or_create(session_id, user_id=None)
        history = list(found.history_json)
        history.append({"user": user_message, "assistant": answer})
        found.history_json = history[-5:]
        await self.session.flush()
        await self.session.refresh(found)
        return found
