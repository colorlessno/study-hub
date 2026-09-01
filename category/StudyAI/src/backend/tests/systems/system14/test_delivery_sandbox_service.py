from __future__ import annotations

import asyncio
from datetime import datetime
from types import SimpleNamespace

from studyai.systems.system14.services import delivery_sandbox_service as service_module
from studyai.systems.system14.services.delivery_sandbox_service import DeliverySandboxService


class _FakeSession:
    committed = False

    async def commit(self) -> None:
        self.committed = True


class _FakeRepository:
    rows: list[SimpleNamespace] = []

    def __init__(self, _session: object) -> None:
        pass

    async def create_webhook_receipt(self, *, payload: dict) -> SimpleNamespace:
        row = SimpleNamespace(id=len(self.rows) + 1, payload=payload, received_at=datetime(2026, 9, 1, 22, 30))
        self.rows.append(row)
        return row

    async def list_webhook_receipts(self, *, limit: int) -> list[SimpleNamespace]:
        return list(reversed(self.rows))[:limit]


class _FakeMailpitResponse:
    status_code = 200

    @staticmethod
    def json() -> dict:
        return {
            "messages": [
                {
                    "ID": "mail-1",
                    "Subject": "System14 workflow: 週次分析",
                    "From": {"Address": "system14@studyai.local"},
                    "To": [{"Address": "team@example.test"}],
                    "Created": "2026-09-01T22:31:00Z",
                    "Snippet": "分析結果",
                }
            ]
        }


class _FakeMailpitClient:
    def __init__(self, **_kwargs: object) -> None:
        pass

    async def __aenter__(self) -> "_FakeMailpitClient":
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None

    async def get(self, _url: str, *, params: dict) -> _FakeMailpitResponse:
        assert params == {"limit": 20}
        return _FakeMailpitResponse()


def test_delivery_configuration_reports_safe_readiness(monkeypatch) -> None:
    monkeypatch.setenv("SYSTEM14_WEBHOOK_SINK_ENDPOINT", "http://127.0.0.1:8014/api/delivery-sandbox/webhook")
    monkeypatch.setenv("SYSTEM14_WEBHOOK_BEARER_TOKEN", "secret-token")
    monkeypatch.setenv("SYSTEM14_SMTP_HOST", "system14-mailpit")
    monkeypatch.setenv("SYSTEM14_SMTP_PORT", "1025")
    monkeypatch.setenv("SYSTEM14_MAILPIT_API_URL", "http://system14-mailpit:8025/api/v1/messages")
    monkeypatch.setenv("SYSTEM14_MAILPIT_PUBLIC_URL", "http://127.0.0.1:18025")
    monkeypatch.setenv("SYSTEM14_DUMMY_CRM_ENDPOINT", "http://127.0.0.1:8014/api/dummy-crm/activities")
    monkeypatch.setenv("SYSTEM14_DUMMY_CRM_TOKEN", "crm-secret")

    configuration = DeliverySandboxService().get_configuration()

    assert configuration.webhook_configured is True
    assert configuration.email_configured is True
    assert configuration.dummy_crm_configured is True
    assert configuration.actual_crm_configured is False
    assert configuration.smtp_destination == "system14-mailpit:1025"
    assert "secret-token" not in configuration.model_dump_json()
    assert "crm-secret" not in configuration.model_dump_json()


def test_delivery_sandbox_persists_and_lists_webhooks(monkeypatch) -> None:
    _FakeRepository.rows.clear()
    monkeypatch.setattr(service_module, "InsightRepository", _FakeRepository)
    session = _FakeSession()
    service = DeliverySandboxService()

    receipt = asyncio.run(service.receive_webhook(session, payload={"event": "voice-ranking"}))
    receipts = asyncio.run(service.list_webhook_receipts(session, limit=20))

    assert session.committed is True
    assert receipt.payload == {"event": "voice-ranking"}
    assert [item.id for item in receipts.receipts] == [1]


def test_delivery_sandbox_reads_mailpit_messages(monkeypatch) -> None:
    monkeypatch.setenv("SYSTEM14_MAILPIT_API_URL", "http://system14-mailpit:8025/api/v1/messages")
    monkeypatch.setattr(service_module.httpx, "AsyncClient", _FakeMailpitClient)

    result = asyncio.run(DeliverySandboxService().list_email_messages(limit=20))

    assert len(result.messages) == 1
    assert result.messages[0].id == "mail-1"
    assert result.messages[0].recipients == ["team@example.test"]
