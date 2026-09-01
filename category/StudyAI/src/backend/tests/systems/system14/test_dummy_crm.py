from __future__ import annotations

import pytest
from pydantic import ValidationError

from studyai.common.errors.models import AppError
from studyai.systems.system14.api.router import _require_dummy_crm_token
from studyai.systems.system14.schemas.insight import (
    DummyCrmActivityCreate,
    DummyCrmActivityUpdate,
    WorkflowCreateRequest,
)


def test_dummy_crm_workflow_does_not_require_external_endpoint() -> None:
    body = WorkflowCreateRequest(
        name="ローカルCRM登録",
        output_type="voice_ranking",
        delivery={"method": "crm_dummy"},
    )

    assert body.delivery.method == "crm_dummy"
    assert body.delivery.endpoint is None


def test_dummy_crm_activity_validates_required_fields() -> None:
    body = DummyCrmActivityCreate(
        external_id="system14-workflow-1",
        summary="配送遅延に関する顧客の声を登録しました。",
    )

    assert body.status == "open"
    assert body.urgency == "normal"

    with pytest.raises(ValidationError):
        DummyCrmActivityUpdate()


def test_dummy_crm_requires_matching_bearer_token(monkeypatch) -> None:
    monkeypatch.setenv("SYSTEM14_DUMMY_CRM_TOKEN", "local-test-token")

    _require_dummy_crm_token("Bearer local-test-token")

    with pytest.raises(AppError) as error:
        _require_dummy_crm_token("Bearer wrong-token")
    assert error.value.status_code == 401
    assert error.value.error_code == "dummy_crm_authentication_failed"
