from __future__ import annotations

import pytest

from studyai.common.errors.models import ValidationAppError
from studyai.systems.system06.services.inquiry_classifier import InquiryClassifier


def test_classifier_uses_high_confidence_keyword_rules_without_model_call() -> None:
    classifier = InquiryClassifier()
    result = classifier._heuristic_classify("返金を希望しています。決済トラブルなので至急確認してください。")
    assert result.category == "返金"
    assert result.priority == "緊急"
    assert result.confidence == "高"


def test_validate_channel_rejects_unsupported_value() -> None:
    classifier = InquiryClassifier()
    with pytest.raises(ValidationAppError):
        classifier.validate_channel("phone")
