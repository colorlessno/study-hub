from __future__ import annotations

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.errors.models import NotFoundAppError
from studyai.systems.system03.models.document import System03QuestionLog


class QuestionLogRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_log(
        self,
        *,
        session_id: str,
        project_id: str,
        question: str,
        answer: str | None,
        sources: list[dict],
        confidence: str | None,
        answer_status: str,
    ) -> System03QuestionLog:
        log = System03QuestionLog(
            session_id=session_id,
            project_id=project_id,
            question=question,
            answer=answer,
            sources=sources,
            confidence=confidence,
            answer_status=answer_status,
        )
        self.session.add(log)
        await self.session.flush()
        await self.session.refresh(log)
        return log

    async def submit_feedback(self, answer_id: int, is_helpful: bool, comment: str | None) -> System03QuestionLog:
        result = await self.session.execute(
            select(System03QuestionLog).where(System03QuestionLog.id == answer_id)
        )
        log = result.scalar_one_or_none()
        if log is None:
            raise NotFoundAppError("feedback_target_not_found", "対象の回答履歴が見つかりません。")
        log.rating = 5 if is_helpful else 1
        log.feedback_comment = comment
        await self.session.flush()
        await self.session.refresh(log)
        return log

    async def get_popular_questions(self, project_id: str | None, limit: int) -> list[dict[str, object]]:
        stmt = (
            select(
                System03QuestionLog.question,
                func.count(System03QuestionLog.id).label("count"),
                func.avg(System03QuestionLog.rating).label("avg_rating"),
            )
            .where(System03QuestionLog.answer_status == "answered")
            .group_by(System03QuestionLog.question)
            .order_by(desc("count"), System03QuestionLog.question)
            .limit(limit)
        )
        if project_id:
            stmt = stmt.where(System03QuestionLog.project_id == project_id)
        rows = await self.session.execute(stmt)
        return [
            {
                "question": row.question,
                "count": row.count,
                "avg_rating": float(row.avg_rating) if row.avg_rating is not None else None,
            }
            for row in rows
        ]

    async def get_unanswered_questions(self, project_id: str | None, limit: int) -> list[dict[str, object]]:
        stmt = (
            select(System03QuestionLog.question, func.count(System03QuestionLog.id).label("count"))
            .where(System03QuestionLog.answer_status == "unanswered")
            .group_by(System03QuestionLog.question)
            .order_by(desc("count"), System03QuestionLog.question)
            .limit(limit)
        )
        if project_id:
            stmt = stmt.where(System03QuestionLog.project_id == project_id)
        rows = await self.session.execute(stmt)
        return [{"question": row.question, "count": row.count} for row in rows]
