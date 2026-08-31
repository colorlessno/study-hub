from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system12.repositories.session_repository import SessionRepository


class SessionMemoryService:
    async def load_session(self, session: AsyncSession, session_id: str):
        return await SessionRepository(session).get_or_create(session_id)

    async def store_user_message(self, session: AsyncSession, *, session_id: str, message: str) -> None:
        await SessionRepository(session).append_history(session_id, "user", message)

    async def store_assistant_message(self, session: AsyncSession, *, session_id: str, message: str) -> None:
        await SessionRepository(session).append_history(session_id, "assistant", message)

    async def merge_conditions(self, session: AsyncSession, *, session_id: str, conditions: dict):
        return await SessionRepository(session).update_conditions(session_id, conditions)

    async def store_recommendations(self, session: AsyncSession, *, session_id: str, product_ids: list[int]) -> None:
        await SessionRepository(session).update_recommendations(session_id, product_ids)
