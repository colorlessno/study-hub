from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.audit.logger import get_audit_logger
from studyai.systems.system12.graph.graph import ChatGraphOrchestrator
from studyai.systems.system12.repositories.session_repository import SessionRepository
from studyai.systems.system12.schemas.gift import (
    ChatFeedbackRequest,
    ChatFeedbackResponse,
    ChatRequest,
    ChatResponse,
)


class ChatService:
    def __init__(self) -> None:
        self.graph_orchestrator = ChatGraphOrchestrator()
        self.audit_logger = get_audit_logger()

    async def chat(
        self,
        session: AsyncSession,
        *,
        body: ChatRequest,
        trace_id: str,
        user_id: str | None,
    ) -> ChatResponse:
        state = await self.graph_orchestrator.run(
            session,
            body=body,
            trace_id=trace_id,
            user_id=user_id,
        )
        await session.commit()

        response = ChatResponse(**dict(state.get("response_payload") or {}))
        if response.response_type == "recommendation":
            recommended_ids = [item.product_id for item in response.recommendations]
            self.audit_logger.log(
                action="system12.chat.recommended",
                trace_id=trace_id,
                user_id=user_id,
                resource_type="system12_session",
                resource_id=body.session_id,
                details={"recommended_ids": recommended_ids},
            )
        return response

    async def submit_feedback(
        self,
        session: AsyncSession,
        *,
        body: ChatFeedbackRequest,
        trace_id: str,
        user_id: str | None,
    ) -> ChatFeedbackResponse:
        feedback = {
            "liked": body.liked,
            "disliked_reasons": body.disliked_reasons,
            "selected_product_id": body.selected_product_id,
        }
        await SessionRepository(session).append_feedback(session_id=body.session_id, feedback=feedback)
        await session.commit()
        self.audit_logger.log(
            action="system12.chat.feedback",
            trace_id=trace_id,
            user_id=user_id,
            resource_type="system12_session",
            resource_id=body.session_id,
            details=feedback,
        )
        return ChatFeedbackResponse(
            session_id=body.session_id,
            stored=True,
            message="Feedback stored.",
        )
