from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system03.repositories.question_log_repository import QuestionLogRepository
from studyai.systems.system03.schemas.qa import (
    PopularQuestionItem,
    PopularQuestionsResponse,
    UnansweredQuestionItem,
    UnansweredQuestionsResponse,
)


class AnalyticsService:
    async def get_popular_questions(
        self,
        session: AsyncSession,
        *,
        project_id: str | None,
        limit: int,
    ) -> PopularQuestionsResponse:
        items = await QuestionLogRepository(session).get_popular_questions(project_id, limit)
        return PopularQuestionsResponse(
            items=[
                PopularQuestionItem(
                    question=str(item["question"]),
                    count=int(item["count"]),
                    avg_rating=float(item["avg_rating"]) if item["avg_rating"] is not None else None,
                )
                for item in items
            ]
        )

    async def get_unanswered_questions(
        self,
        session: AsyncSession,
        *,
        project_id: str | None,
        limit: int,
    ) -> UnansweredQuestionsResponse:
        items = await QuestionLogRepository(session).get_unanswered_questions(project_id, limit)
        return UnansweredQuestionsResponse(
            items=[UnansweredQuestionItem(question=str(item["question"]), count=int(item["count"])) for item in items]
        )
