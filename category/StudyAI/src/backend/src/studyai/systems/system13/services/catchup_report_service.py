from __future__ import annotations

import asyncio
from datetime import date, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.ai.llm_client import LLMClient
from studyai.common.errors.models import ConflictAppError, ExternalServiceError
from studyai.systems.system13.prompts.onboarding_prompt import build_catchup_report_prompts
from studyai.systems.system13.repositories.knowledge_repository import KnowledgeRepository
from studyai.systems.system13.repositories.member_repository import MemberRepository
from studyai.systems.system13.repositories.project_repository import ProjectRepository
from studyai.systems.system13.schemas.education import (
    CatchupReportDocument,
    CatchupReportKeyPerson,
    CatchupReportResponse,
)
from studyai.systems.system13.services.checklist_service import ChecklistService


class CatchupReportService:
    MODEL_TIMEOUT_SECONDS = 30

    def __init__(self) -> None:
        self.llm_client = LLMClient()
        self.checklist_service = ChecklistService()

    async def build_report(
        self,
        session: AsyncSession,
        *,
        project_id: str,
        user_id: str,
        role: str,
    ) -> CatchupReportResponse:
        project = await ProjectRepository(session).get(project_id)
        member = await MemberRepository(session).get_or_create(
            project_id=project_id,
            user_id=user_id,
            role=role,
        )
        knowledge_repo = KnowledgeRepository(session)
        high_priority = await knowledge_repo.list_high_priority(project_id, limit=8)
        if not high_priority:
            raise ConflictAppError(
                "insufficient_knowledge",
                "The project does not have enough knowledge for a catch-up report.",
            )
        landmines = await knowledge_repo.list_landmines(project_id, limit=8)
        members = await MemberRepository(session).list_members(project_id)
        checklist = await self.checklist_service.get_checklist(
            session,
            project_id=project_id,
            user_id=user_id,
            fallback_role=role,
        )

        system_prompt, user_prompt = build_catchup_report_prompts(
            project={
                "project_id": project.id,
                "name": project.name,
                "overview": project.overview,
                "status": project.status,
                "tech_stack": project.tech_stack,
            },
            role=role,
            days_since_joined=self._days_since_joined(member.joined_at),
            high_priority_knowledge=[
                {
                    "title": item.title,
                    "category": item.category,
                    "importance": item.importance,
                    "content": item.content[:500],
                }
                for item in high_priority
            ],
            landmines=[
                {
                    "title": item.title,
                    "content": item.content[:400],
                }
                for item in landmines
            ],
            key_persons=[
                {
                    "name": person.name or person.user_id,
                    "role": person.role or "member",
                    "contact": None,
                }
                for person in members[:5]
            ],
            checklist_items=[
                {"title": item.title, "category": item.category}
                for item in checklist.items[:5]
            ],
        )
        try:
            raw = await asyncio.wait_for(
                self.llm_client.extract_json(system_prompt, user_prompt),
                timeout=self.MODEL_TIMEOUT_SECONDS,
            )
        except (TimeoutError, ExternalServiceError):
            raw = {
                "overview": project.overview or project.name,
                "critical_issues": [item.title for item in landmines[:5]],
                "landmines": [item.title for item in landmines[:5]],
                "first_week_tasks": [item.title for item in checklist.items[:5]],
            }

        important_docs = raw.get("important_docs") or [
            {"title": item.title, "category": item.category}
            for item in high_priority[:5]
        ]
        key_persons = raw.get("key_persons") or [
            {"name": person.name or person.user_id, "role": person.role or "member", "contact": None}
            for person in members[:5]
        ]
        return CatchupReportResponse(
            project_id=project_id,
            generated_at=datetime.utcnow(),
            overview=str(raw.get("overview") or project.overview or project.name),
            critical_issues=[str(item) for item in raw.get("critical_issues", [])][:5],
            landmines=[str(item) for item in raw.get("landmines", [])][:5] or [item.title for item in landmines[:5]],
            key_persons=[CatchupReportKeyPerson(**item) for item in key_persons[:5]],
            important_docs=[CatchupReportDocument(**item) for item in important_docs[:5]],
            first_week_tasks=[str(item) for item in raw.get("first_week_tasks", [])][:5],
        )

    @staticmethod
    def _days_since_joined(joined_at: date | None) -> int:
        if joined_at is None:
            return 0
        return max(0, (date.today() - joined_at).days)
