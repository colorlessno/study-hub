from __future__ import annotations

import asyncio
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.ai.llm_client import LLMClient
from studyai.common.audit.logger import get_audit_logger
from studyai.common.auth.models import AuthenticatedUser
from studyai.common.errors.models import ConflictAppError, ExternalServiceError
from studyai.systems.system13.prompts.onboarding_prompt import build_ask_prompts
from studyai.systems.system13.repositories.member_repository import MemberRepository
from studyai.systems.system13.repositories.project_repository import ProjectRepository
from studyai.systems.system13.repositories.question_log_repository import QuestionLogRepository
from studyai.systems.system13.repositories.session_repository import SessionRepository
from studyai.systems.system13.schemas.education import AskEscalation, AskRequest, AskResponse, AskSource
from studyai.systems.system13.services.knowledge_retriever import KnowledgeRetriever


class AskService:
    MODEL_TIMEOUT_SECONDS = 30

    def __init__(self) -> None:
        self.retriever = KnowledgeRetriever()
        self.llm_client = LLMClient()
        self.audit_logger = get_audit_logger()

    async def ask(
        self,
        session: AsyncSession,
        request: AskRequest,
        *,
        current_user: AuthenticatedUser | None = None,
        trace_id: str | None = None,
    ) -> AskResponse:
        await ProjectRepository(session).get(request.project_id)
        role = (request.role or self._resolve_role(current_user)).strip().lower()
        member = await MemberRepository(session).get_or_create(
            project_id=request.project_id,
            user_id=request.user_id,
            role=role,
            joined_at=date.today(),
        )
        session_repo = SessionRepository(session)
        log_repo = QuestionLogRepository(session)
        conversation = await session_repo.get_or_create(request.session_id, request.project_id, request.user_id)
        retrieved = await self.retriever.retrieve(
            session,
            project_id=request.project_id,
            question=request.question,
            limit=4,
        )
        if not retrieved:
            unanswered = await log_repo.create_log(
                session_id=request.session_id,
                project_id=request.project_id,
                user_id=request.user_id,
                question=request.question,
                answer=None,
                sources=[],
                related_info=[],
                confidence="low",
                escalation={"target": "project_lead", "reason": "No project knowledge matched the question."},
                has_warning=True,
                is_answered=False,
            )
            await session.commit()
            raise ConflictAppError(
                "insufficient_knowledge",
                "The project knowledge is not sufficient to answer the question.",
                {"answer_id": unanswered.id},
            )

        sources_payload = [
            {
                "title": item.knowledge.title,
                "category": item.knowledge.category,
                "importance": item.knowledge.importance,
                "excerpt": item.knowledge.content[:400],
                "is_landmine": item.knowledge.is_landmine,
            }
            for item in retrieved
        ]
        system_prompt, user_prompt = build_ask_prompts(
            question=request.question,
            project_id=request.project_id,
            role=member.role or role,
            days_since_joined=self._days_since_joined(member.joined_at),
            history=conversation.history[-5:],
            sources=sources_payload,
        )
        try:
            raw = await asyncio.wait_for(
                self.llm_client.extract_json(system_prompt, user_prompt),
                timeout=self.MODEL_TIMEOUT_SECONDS,
            )
        except (TimeoutError, ExternalServiceError):
            primary_source = sources_payload[0]
            raw = {
                "answer": primary_source["excerpt"],
                "confidence": "medium",
                "sources": [{"title": primary_source["title"]}],
                "related_info": [source["title"] for source in sources_payload[1:4]],
                "warning": "AIによる回答生成が制限時間を超えたため、最も関連する登録済みナレッジを表示しています。",
            }
        known_sources = {str(source["title"]): source for source in sources_payload}
        selected_sources = []
        for source in raw.get("sources") or []:
            if not isinstance(source, dict):
                continue
            known_source = known_sources.get(str(source.get("title") or ""))
            if known_source and known_source not in selected_sources:
                selected_sources.append(known_source)

        sources = [
            AskSource(
                title=str(source["title"]),
                category=str(source.get("category") or "general"),
                excerpt=str(source.get("excerpt") or ""),
                importance=str(source.get("importance") or "medium"),
            )
            for source in (selected_sources or sources_payload[:3])
        ]
        warning = raw.get("warning")
        if any(item.knowledge.is_landmine for item in retrieved):
            landmine_warning = "この回答には、プロジェクトで注意が必要な情報が含まれます。参照ナレッジの内容を確認してください。"
            warning = f"{warning} {landmine_warning}" if warning else landmine_warning
        escalation_payload = raw.get("escalation")
        escalation = None
        if isinstance(escalation_payload, dict) and escalation_payload.get("target") and escalation_payload.get("reason"):
            escalation = AskEscalation(
                target=str(escalation_payload["target"]),
                reason=str(escalation_payload["reason"]),
            )
        related_info = [str(item).strip() for item in raw.get("related_info", []) if str(item).strip()][:3]
        answer = str(raw.get("answer", "")).strip()
        saved = await log_repo.create_log(
            session_id=request.session_id,
            project_id=request.project_id,
            user_id=request.user_id,
            question=request.question,
            answer=answer,
            sources=[source.model_dump() for source in sources],
            related_info=related_info,
            confidence=str(raw.get("confidence", "medium")).strip() or "medium",
            escalation=escalation.model_dump() if escalation else None,
            has_warning=bool(warning),
            is_answered=True,
        )
        await session_repo.append_history(request.session_id, request.question, answer)
        await session.commit()
        self.audit_logger.log(
            action="system13.ask",
            actor=request.user_id,
            target_type="session",
            target_id=request.session_id,
            trace_id=trace_id,
            metadata={"project_id": request.project_id, "answer_id": saved.id},
        )
        return AskResponse(
            answer_id=saved.id,
            session_id=request.session_id,
            question=request.question,
            answer=answer,
            confidence=str(raw.get("confidence", "medium")).strip() or "medium",
            sources=sources,
            warning=str(warning) if warning else None,
            related_info=related_info,
            escalation=escalation,
        )

    @staticmethod
    def _resolve_role(current_user: AuthenticatedUser | None) -> str:
        if current_user and current_user.roles:
            return current_user.roles[0]
        return "member"

    @staticmethod
    def _days_since_joined(joined_at) -> int:
        if not joined_at:
            return 0
        return max(0, (date.today() - joined_at).days)
