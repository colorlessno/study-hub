from __future__ import annotations

from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.audit.logger import get_audit_logger
from studyai.common.errors.models import ConflictAppError, ValidationAppError
from studyai.systems.system06.repositories.faq_repository import FAQRepository
from studyai.systems.system06.repositories.inquiry_repository import InquiryRepository
from studyai.systems.system06.repositories.session_repository import SessionRepository
from studyai.systems.system06.schemas.support import (
    InquiryCreateRequest,
    InquiryCreateResponse,
    InquiryFeedbackRequest,
    InquiryFeedbackResponse,
    InquiryListItem,
    InquiryListResponse,
    InquiryResponseBody,
    InquiryStatusUpdateRequest,
    InquiryStatusUpdateResponse,
    SupportClassification,
)
from studyai.systems.system06.services.escalation_service import EscalationService
from studyai.systems.system06.services.faq_retriever import FAQRetriever
from studyai.systems.system06.services.inquiry_classifier import InquiryClassifier
from studyai.systems.system06.services.pii_masker import PIIMasker
from studyai.systems.system06.services.response_generator import ResponseGenerator


class InquiryService:
    STATUS_TRANSITIONS = {
        "open": {"answered", "escalated", "closed"},
        "answered": {"closed", "escalated"},
        "escalated": {"answered", "closed"},
        "closed": set(),
    }

    def __init__(self) -> None:
        self.classifier = InquiryClassifier()
        self.faq_retriever = FAQRetriever()
        self.response_generator = ResponseGenerator()
        self.escalation_service = EscalationService()
        self.masker = PIIMasker()
        self.audit_logger = get_audit_logger()

    async def create_inquiry(
        self,
        session: AsyncSession,
        *,
        body: InquiryCreateRequest,
        trace_id: str,
    ) -> InquiryCreateResponse:
        self.classifier.validate_channel(body.channel)
        masked_message = self.masker.mask(body.message, order_id=body.order_id, member_id=body.member_id)
        session_record = await SessionRepository(session).get_or_create(body.session_id, body.user_id)
        classification = await self.classifier.classify(body.message, context_note=body.context_note)
        repeat_count = await InquiryRepository(session).count_same_user_category(
            user_id=body.user_id,
            category=classification.category,
        )
        decision = self.escalation_service.should_escalate(
            message=body.message,
            classification=classification,
            repeat_count=repeat_count,
        )
        if decision.required:
            faq_hits = []
            generated = {
                "type": "escalated",
                "message": (
                    "お問い合わせ内容を確認し、担当者への引き継ぎが必要と判断しました。"
                    "担当者より順次ご連絡します。"
                ),
                "sources": [],
                "next_actions": ["担当者からの連絡をお待ちください。"],
                "is_resolved_question": None,
                "escalation_reason": decision.reason,
            }
        else:
            faq_hits = await self.faq_retriever.retrieve(session, message=body.message)
            generated = await self.response_generator.generate(
                message=body.message,
                classification=classification,
                faq_hits=faq_hits,
                history=list(session_record.history_json),
            )

        response_type = generated["type"]
        status = "open"
        escalated = False
        if decision.required:
            response_type = "escalated"
            status = "escalated"
            escalated = True
        elif classification.confidence == "中":
            response_type = "review"
            status = "open"
        else:
            response_type = "auto"
            status = "answered"

        inquiry = await InquiryRepository(session).create_inquiry(
            session_id=body.session_id,
            user_id=body.user_id,
            channel=body.channel,
            order_id=body.order_id,
            member_id=body.member_id,
            message_masked=masked_message,
            category=classification.category,
            priority=classification.priority,
            confidence=classification.confidence,
            response_type=response_type,
            response_message=generated["message"],
            response_sources=generated["sources"],
            next_actions=generated["next_actions"],
            status=status,
            escalated=escalated,
        )

        escalation_id: int | None = None
        if decision.required and decision.reason:
            escalation_id = await self.escalation_service.create_escalation(
                session,
                inquiry_id=inquiry.id,
                assignee=None,
                reason=decision.reason,
                recommendation=decision.recommendation,
                trace_id=trace_id,
                user_id=body.user_id,
            )
            inquiry.escalation_id = escalation_id

        faq_ids = [item.faq.id for item in faq_hits[:3]]
        await FAQRepository(session).increment_use_counts(faq_ids)
        await SessionRepository(session).append_history(body.session_id, body.message, generated["message"])
        await session.commit()
        self.audit_logger.log(
            action="system06.inquiry.created",
            trace_id=trace_id,
            user_id=body.user_id,
            resource_type="system06_inquiry",
            resource_id=inquiry.id,
            details={"category": classification.category, "priority": classification.priority, "escalated": escalated},
        )
        return InquiryCreateResponse(
            inquiry_id=inquiry.id,
            session_id=body.session_id,
            classification=SupportClassification(
                category=classification.category,
                priority=classification.priority,
                confidence=classification.confidence,
            ),
            response=InquiryResponseBody(
                type=response_type,
                message=generated["message"],
                sources=generated["sources"],
                next_actions=generated["next_actions"],
                is_resolved_question=generated.get("is_resolved_question"),
                escalation_reason=generated.get("escalation_reason"),
            ),
            escalated=escalated,
            escalation_id=escalation_id,
        )

    async def submit_feedback(
        self,
        session: AsyncSession,
        *,
        inquiry_id: int,
        body: InquiryFeedbackRequest,
        trace_id: str,
        user_id: str | None,
    ) -> InquiryFeedbackResponse:
        inquiry = await InquiryRepository(session).update_feedback(
            inquiry_id=inquiry_id,
            is_resolved=body.is_resolved,
            rating=body.rating,
            comment=body.comment,
        )
        await session.commit()
        self.audit_logger.log(
            action="system06.inquiry.feedback",
            trace_id=trace_id,
            user_id=user_id,
            resource_type="system06_inquiry",
            resource_id=inquiry_id,
            details={"is_resolved": body.is_resolved, "rating": body.rating},
        )
        return InquiryFeedbackResponse(
            inquiry_id=inquiry.id,
            is_resolved=bool(inquiry.is_resolved),
            rating=inquiry.rating,
            comment=inquiry.feedback_comment,
        )

    async def update_status(
        self,
        session: AsyncSession,
        *,
        inquiry_id: int,
        body: InquiryStatusUpdateRequest,
        trace_id: str,
        user_id: str | None,
    ) -> InquiryStatusUpdateResponse:
        inquiry = await InquiryRepository(session).get_by_id(inquiry_id)
        allowed = self.STATUS_TRANSITIONS.get(inquiry.status, set())
        if body.status not in {"open", "answered", "escalated", "closed"}:
            raise ValidationAppError("invalid_status", "status must be open, answered, escalated, or closed.")
        if body.status != inquiry.status and body.status not in allowed:
            raise ConflictAppError("invalid_status_transition", "The requested status transition is not allowed.")
        updated = await InquiryRepository(session).update_status(
            inquiry_id=inquiry_id,
            status=body.status,
            assignee=body.assignee,
            resolution=body.resolution,
        )
        await session.commit()
        self.audit_logger.log(
            action="system06.inquiry.status_updated",
            trace_id=trace_id,
            user_id=user_id,
            resource_type="system06_inquiry",
            resource_id=inquiry_id,
            details={"status": body.status, "assignee": body.assignee},
        )
        return InquiryStatusUpdateResponse(
            inquiry_id=updated.id,
            status=updated.status,
            assignee=updated.assignee,
            resolution=updated.resolution,
        )

    async def list_inquiries(
        self,
        session: AsyncSession,
        *,
        category: str | None,
        priority: str | None,
        status: str | None,
        escalated: bool | None,
        from_date: date | None,
        to_date: date | None,
    ) -> InquiryListResponse:
        inquiries = await InquiryRepository(session).list_inquiries(
            category=category,
            priority=priority,
            status=status,
            escalated=escalated,
            from_date=from_date,
            to_date=to_date,
        )
        return InquiryListResponse(
            total=len(inquiries),
            items=[
                InquiryListItem(
                    inquiry_id=item.id,
                    session_id=item.session_id,
                    user_id=item.user_id,
                    channel=item.channel,
                    category=item.category,
                    priority=item.priority,
                    confidence=item.confidence,
                    status=item.status,
                    escalated=item.escalated,
                    response_type=item.response_type,
                    created_at=item.created_at,
                )
                for item in inquiries
            ],
        )
