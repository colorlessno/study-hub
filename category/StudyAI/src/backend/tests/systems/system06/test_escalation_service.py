from __future__ import annotations

from studyai.systems.system06.services.escalation_service import EscalationService
from studyai.systems.system06.services.inquiry_classifier import ClassifiedInquiry


def test_escalation_service_detects_human_request() -> None:
    decision = EscalationService().should_escalate(
        message="担当者と話したいので電話してください。",
        classification=ClassifiedInquiry(category="配送・納期", priority="中", confidence="高"),
        repeat_count=1,
    )
    assert decision.required is True
    assert "担当者" in (decision.reason or "")


def test_escalation_service_detects_repeated_inquiry() -> None:
    decision = EscalationService().should_escalate(
        message="配送が遅いです。",
        classification=ClassifiedInquiry(category="配送・納期", priority="中", confidence="高"),
        repeat_count=3,
    )
    assert decision.required is True
    assert "繰り返" in (decision.reason or "")
