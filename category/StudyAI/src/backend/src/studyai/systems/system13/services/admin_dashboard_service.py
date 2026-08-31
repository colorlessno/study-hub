from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system13.repositories.checklist_repository import ChecklistRepository
from studyai.systems.system13.repositories.knowledge_repository import KnowledgeRepository
from studyai.systems.system13.repositories.project_repository import ProjectRepository
from studyai.systems.system13.repositories.question_log_repository import QuestionLogRepository
from studyai.systems.system13.schemas.education import (
    DashboardCategoryStat,
    DashboardLowProgressMember,
    DashboardResponse,
    DashboardUnansweredQuestion,
)


class AdminDashboardService:
    async def build_dashboard(self, session: AsyncSession, *, project_id: str) -> DashboardResponse:
        await ProjectRepository(session).get(project_id)
        unanswered = await QuestionLogRepository(session).list_unanswered(project_id, limit=10)
        progress = await ChecklistRepository(session).progress_by_project(project_id)
        progress.sort(key=lambda item: (item["progress_rate"], item["user_id"]))
        categories = await KnowledgeRepository(session).category_counts(project_id)
        return DashboardResponse(
            project_id=project_id,
            unanswered_questions=[DashboardUnansweredQuestion(**item) for item in unanswered],
            low_progress_members=[
                DashboardLowProgressMember(
                    user_id=item["user_id"],
                    role=str(item["role"]),
                    progress_rate=float(item["progress_rate"]),
                )
                for item in progress[:10]
            ],
            category_stats=[DashboardCategoryStat(**item) for item in categories],
        )
