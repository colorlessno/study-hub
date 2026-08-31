from __future__ import annotations

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system13.models.education import System13QuestionLog


class QuestionLogRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_log(
        self,
        *,
        session_id: str,
        project_id: str,
        user_id: str,
        question: str,
        answer: str | None,
        sources: list[dict],
        related_info: list[str],
        confidence: str | None,
        escalation: dict | None,
        has_warning: bool,
        is_answered: bool,
    ) -> System13QuestionLog:
        log = System13QuestionLog(
            session_id=session_id,
            project_id=project_id,
            user_id=user_id,
            question=question,
            answer=answer,
            sources=sources,
            related_info=related_info,
            confidence=confidence,
            escalation=escalation,
            has_warning=has_warning,
            is_answered=is_answered,
        )
        self.session.add(log)
        await self.session.flush()
        await self.session.refresh(log)
        return log

    async def list_unanswered(self, project_id: str, *, limit: int = 10) -> list[dict[str, object]]:
        rows = await self.session.execute(
            select(System13QuestionLog.question, func.count(System13QuestionLog.id).label("count"))
            .where(
                System13QuestionLog.project_id == project_id,
                System13QuestionLog.is_answered.is_(False),
            )
            .group_by(System13QuestionLog.question)
            .order_by(desc("count"), System13QuestionLog.question)
            .limit(limit)
        )
        return [{"question": row.question, "count": int(row.count)} for row in rows]
