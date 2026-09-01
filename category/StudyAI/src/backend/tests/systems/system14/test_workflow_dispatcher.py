from __future__ import annotations

import asyncio

from studyai.systems.system14.services import workflow_dispatcher as workflow_module
from studyai.systems.system14.services.workflow_dispatcher import WorkflowDispatcher


class _FakeHttpResponse:
    status_code = 202
    text = "accepted"

    @staticmethod
    def json() -> dict:
        return {
            "created": True,
            "activity": {"id": 1, "external_id": "system14-workflow-42"},
        }


class _FakeAsyncClient:
    received: list[dict] = []
    received_headers: list[dict | None] = []

    def __init__(self, **_kwargs: object) -> None:
        pass

    async def __aenter__(self) -> "_FakeAsyncClient":
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None

    async def post(self, _endpoint: str, *, json: dict, headers: dict | None = None) -> _FakeHttpResponse:
        self.__class__.received.append(json)
        self.__class__.received_headers.append(headers)
        return _FakeHttpResponse()


class _FakeSmtp:
    messages: list[str] = []

    def __init__(self, **_kwargs: object) -> None:
        pass

    def __enter__(self) -> "_FakeSmtp":
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def starttls(self) -> None:
        pass

    def login(self, _username: str, _password: str) -> None:
        pass

    def send_message(self, message: object) -> None:
        self.__class__.messages.append(str(message))


def test_workflow_dispatcher_normalizes_ui_filters() -> None:
    filters = WorkflowDispatcher._normalize_filters(
        {
            "fromDate": "2026-04-01",
            "to_date": "2026-04-22",
            "product": " 商品A ",
            "callReason": "配送確認",
            "staffId": "staff_001",
            "type": "クレーム",
        }
    )

    assert filters["from_date"].isoformat() == "2026-04-01"
    assert filters["to_date"].isoformat() == "2026-04-22"
    assert filters["product"] == "商品A"
    assert filters["call_reason"] == "配送確認"
    assert filters["staff_id"] == "staff_001"
    assert filters["utterance_type"] == "クレーム"


def test_workflow_dispatcher_dashboard_delivery_succeeds() -> None:
    status, response, error_message = asyncio.run(
        WorkflowDispatcher()._deliver("dashboard", {"method": "dashboard"}, {"output": {"type": "voice_ranking"}})
    )

    assert status == "success"
    assert response["log_table"] == "system14_workflow_delivery_logs"
    assert error_message is None


def test_workflow_dispatcher_posts_payload_to_webhook(monkeypatch) -> None:
    _FakeAsyncClient.received.clear()
    _FakeAsyncClient.received_headers.clear()
    monkeypatch.setattr(workflow_module.httpx, "AsyncClient", _FakeAsyncClient)
    payload = {"workflow": {"name": "顧客の声を配信"}, "output": {"type": "voice_ranking"}}

    status, response, error_message = asyncio.run(
        WorkflowDispatcher()._deliver(
            "webhook",
            {"method": "webhook", "endpoint": "http://webhook.example.test/insights"},
            payload,
        )
    )

    assert status == "success"
    assert response == {"status_code": 202, "body": "accepted"}
    assert error_message is None
    assert _FakeAsyncClient.received == [payload]


def test_workflow_dispatcher_posts_activity_to_dummy_crm(monkeypatch) -> None:
    _FakeAsyncClient.received.clear()
    _FakeAsyncClient.received_headers.clear()
    monkeypatch.setattr(workflow_module.httpx, "AsyncClient", _FakeAsyncClient)
    monkeypatch.setenv(
        "SYSTEM14_DUMMY_CRM_ENDPOINT",
        "http://127.0.0.1:8014/api/dummy-crm/activities",
    )
    monkeypatch.setenv("SYSTEM14_DUMMY_CRM_TOKEN", "local-test-token")
    payload = {
        "workflow": {"id": 42, "name": "顧客の声をCRMへ登録"},
        "filters": {
            "customer_id": "customer-001",
            "customer_name": "株式会社サンプル",
            "staff_id": "staff-001",
            "sentiment": "negative",
            "urgency": "high",
        },
        "output": {
            "type": "voice_ranking",
            "data": {
                "ranking": [{"group_label": "配送遅延", "count": 3}],
            },
        },
    }

    status, response, error_message = asyncio.run(
        WorkflowDispatcher()._deliver("crm_dummy", {"method": "crm_dummy"}, payload)
    )

    assert status == "success"
    assert response["status_code"] == 202
    assert error_message is None
    assert _FakeAsyncClient.received == [
        {
            "external_id": "system14-workflow-42",
            "customer_id": "customer-001",
            "customer_name": "株式会社サンプル",
            "contact_type": "voice_ranking",
            "summary": "顧客の声の最多項目は「配送遅延」で3件です。",
            "sentiment": "negative",
            "urgency": "high",
            "assigned_to": "staff-001",
            "next_action": "分析結果の根拠を確認し、担当部門の対応方針を決定する",
            "follow_up_at": None,
            "status": "open",
            "source_payload": payload,
        }
    ]
    assert _FakeAsyncClient.received_headers == [
        {
            "Authorization": "Bearer local-test-token",
            "Idempotency-Key": "system14-workflow-42",
        }
    ]


def test_workflow_dispatcher_dummy_crm_requires_configuration(monkeypatch) -> None:
    monkeypatch.delenv("SYSTEM14_DUMMY_CRM_ENDPOINT", raising=False)
    monkeypatch.delenv("SYSTEM14_DUMMY_CRM_TOKEN", raising=False)

    status, response, error_message = asyncio.run(
        WorkflowDispatcher()._deliver(
            "crm_dummy",
            {"method": "crm_dummy"},
            {"workflow": {"id": 1}, "filters": {}, "output": {}},
        )
    )

    assert status == "failed"
    assert response["message"] == "dummy_crm_endpoint_not_configured"
    assert error_message == "SYSTEM14_DUMMY_CRM_ENDPOINT is not configured."


def test_workflow_dispatcher_email_delivery_skips_without_smtp(monkeypatch) -> None:
    monkeypatch.delenv("SYSTEM14_SMTP_HOST", raising=False)

    status, response, error_message = asyncio.run(
        WorkflowDispatcher()._deliver("email", {"method": "email", "recipients": ["team@example.com"]}, {})
    )

    assert status == "skipped"
    assert response["message"] == "smtp_not_configured"
    assert error_message == "SYSTEM14_SMTP_HOST is not configured."


def test_workflow_dispatcher_sends_email_to_configured_smtp(monkeypatch) -> None:
    _FakeSmtp.messages.clear()
    monkeypatch.setattr(workflow_module.smtplib, "SMTP", _FakeSmtp)
    monkeypatch.setenv("SYSTEM14_SMTP_HOST", "127.0.0.1")
    monkeypatch.setenv("SYSTEM14_SMTP_PORT", "2525")
    monkeypatch.setenv("SYSTEM14_SMTP_FROM", "studyhub@example.test")
    monkeypatch.delenv("SYSTEM14_SMTP_USERNAME", raising=False)
    monkeypatch.delenv("SYSTEM14_SMTP_PASSWORD", raising=False)
    monkeypatch.delenv("SYSTEM14_SMTP_TLS", raising=False)
    payload = {"workflow": {"name": "顧客分析レポート"}, "output": {"type": "dashboard"}}

    status, response, error_message = asyncio.run(
        WorkflowDispatcher()._deliver(
            "email",
            {"method": "email", "recipients": ["team@example.test", "manager@example.test"]},
            payload,
        )
    )

    assert status == "success"
    assert response == {"message": "email_sent", "recipient_count": 2}
    assert error_message is None
    assert len(_FakeSmtp.messages) == 1
    assert "Subject: System14 workflow:" in _FakeSmtp.messages[0]
    assert "team@example.test, manager@example.test" in _FakeSmtp.messages[0]


def test_workflow_dispatcher_crm_delivery_returns_explicit_failure() -> None:
    status, response, error_message = asyncio.run(
        WorkflowDispatcher()._deliver("crm", {"method": "crm", "endpoint": "crm://local"}, {})
    )

    assert status == "failed"
    assert response["message"] == "crm_delivery_not_configured"
    assert error_message is not None
