from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.audit.logger import get_audit_logger
from studyai.systems.system06.repositories.escalation_repository import EscalationRepository
from studyai.systems.system06.services.inquiry_classifier import ClassifiedInquiry


@dataclass(slots=True)
class EscalationDecision:
    required: bool
    reason: str | None = None
    recommendation: str | None = None


class EscalationService:
    HUMAN_REQUEST_KEYWORDS = ["担当者", "人と話したい", "電話", "オペレーター"]
    LEGAL_KEYWORDS = ["返金", "法的", "訴訟", "個人情報", "漏洩", "決済トラブル"]

    def __init__(self) -> None:
        self.audit_logger = get_audit_logger()

    def should_escalate(
        self,
        *,
        message: str,
        classification: ClassifiedInquiry,
        repeat_count: int,
    ) -> EscalationDecision:
        if classification.confidence == "低":
            return EscalationDecision(True, "回答信頼度が低いため担当者確認が必要です。", "FAQだけでは確定回答しない。")
        if classification.priority == "緊急":
            return EscalationDecision(True, "緊急優先度案件です。", "即時に担当者へ連携してください。")
        if any(keyword in message for keyword in self.LEGAL_KEYWORDS):
            return EscalationDecision(True, "返金または法的・高リスクワードを検知しました。", "担当者レビューを必須にしてください。")
        if any(keyword in message for keyword in self.HUMAN_REQUEST_KEYWORDS):
            return EscalationDecision(True, "ユーザーが担当者対応を希望しています。", "人手対応に切り替えてください。")
        if repeat_count >= 3:
            return EscalationDecision(True, "同一カテゴリの問い合わせが繰り返されています。", "履歴を確認して個別対応してください。")
        return EscalationDecision(False)

    async def create_escalation(
        self,
        session: AsyncSession,
        *,
        inquiry_id: int,
        assignee: str | None,
        reason: str,
        recommendation: str | None,
        trace_id: str,
        user_id: str | None,
    ) -> int:
        escalation = await EscalationRepository(session).create_escalation(
            inquiry_id=inquiry_id,
            assignee=assignee,
            reason=reason,
            recommendation=recommendation,
        )
        self.audit_logger.log(
            action="system06.escalation.created",
            trace_id=trace_id,
            user_id=user_id,
            resource_type="system06_inquiry",
            resource_id=inquiry_id,
            details={"escalation_id": escalation.id, "reason": reason},
        )
        return escalation.id
