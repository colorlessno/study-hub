from __future__ import annotations

import asyncio
from types import SimpleNamespace

import pytest

from studyai.common.errors.models import ValidationAppError
from studyai.systems.system14.services import job_manager as job_manager_module
from studyai.systems.system14.services.job_manager import JobManager


class _FakeRequestSession:
    async def commit(self) -> None:
        return None


class _FakeRequestRepository:
    def __init__(self, _session: object) -> None:
        pass

    async def create_job(self, **_values: object) -> None:
        return None


class _FakeUtteranceRepository:
    def __init__(self, _session: object) -> None:
        pass

    async def get_job(self, _job_id: str) -> object:
        return object()

    async def list_job_utterances(self, *, job_id: str) -> list[SimpleNamespace]:
        assert job_id == "job_timestamp"
        return [
            SimpleNamespace(
                id=7,
                conversation_id=3,
                speaker="unknown",
                text="時刻付き発話",
                start_sec=1.25,
                end_sec=2.75,
            )
        ]


class _FakeProcessSession:
    async def __aenter__(self) -> "_FakeProcessSession":
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None

    async def commit(self) -> None:
        return None

    async def rollback(self) -> None:
        return None


class _FakeProcessRepository:
    def __init__(self, _session: object) -> None:
        pass

    async def update_job(self, _job_id: str, **_values: object) -> None:
        return None

    async def create_conversation(self, **values: object) -> tuple[SimpleNamespace, list[SimpleNamespace]]:
        utterances = values["utterances"]
        return SimpleNamespace(id=9), [SimpleNamespace(id=index + 30) for index, _item in enumerate(utterances)]

    async def create_sales_score(self, **_values: object) -> None:
        return None

    async def create_insight_groups(self, _groups: list[dict]) -> None:
        return None


class _FakeRiskDispatcher:
    calls: list[dict] = []

    async def dispatch_risk_alerts(self, _session: object, **values: object) -> list[object]:
        self.__class__.calls.append(dict(values))
        return []


def test_upload_returns_the_processing_failure_status(monkeypatch) -> None:
    manager = JobManager()

    async def fail_processing(*_args: object, **_kwargs: object) -> str:
        return "failed"

    monkeypatch.setattr(job_manager_module, "InsightRepository", _FakeRequestRepository)
    monkeypatch.setattr(manager, "process_job", fail_processing)

    response = asyncio.run(
        manager.upload_data(
            _FakeRequestSession(),
            file_name="sample.json",
            file_bytes=b"{}",
            data_type="chat",
            source="test",
            metadata_raw=None,
        )
    )

    assert response.status == "failed"


def test_job_managers_share_one_ingestion_lock() -> None:
    assert JobManager()._ingestion_lock is JobManager()._ingestion_lock


def test_job_utterances_return_saved_timestamps(monkeypatch) -> None:
    monkeypatch.setattr(job_manager_module, "InsightRepository", _FakeUtteranceRepository)

    response = asyncio.run(JobManager().get_job_utterances(object(), job_id="job_timestamp"))

    assert response.model_dump() == {
        "job_id": "job_timestamp",
        "utterances": [
            {
                "id": 7,
                "conversation_id": 3,
                "speaker": "unknown",
                "text": "時刻付き発話",
                "start_sec": 1.25,
                "end_sec": 2.75,
            }
        ],
    }


def test_upload_rejects_unknown_analysis_mode() -> None:
    with pytest.raises(ValidationAppError) as exc_info:
        asyncio.run(
            JobManager().upload_data(
                _FakeRequestSession(),
                file_name="sample.json",
                file_bytes=b"{}",
                data_type="chat",
                source="test",
                metadata_raw=None,
                analysis_mode="automatic",
            )
        )

    assert exc_info.value.error_code == "invalid_analysis_mode"


def test_process_job_dispatches_saved_high_risk_utterance(monkeypatch) -> None:
    _FakeRiskDispatcher.calls.clear()
    manager = JobManager()
    manager.workflow_dispatcher = _FakeRiskDispatcher()

    async def normalized_input(**_values: object) -> list[dict]:
        return [
            {
                "metadata": {"product": "商品A", "analysis_mode": "rules"},
                "utterances": [{"speaker": "customer", "text": "法的対応を至急検討します"}],
            }
        ]

    monkeypatch.setattr(manager, "_normalize_input", normalized_input)
    monkeypatch.setattr(job_manager_module, "SessionLocal", _FakeProcessSession)
    monkeypatch.setattr(job_manager_module, "InsightRepository", _FakeProcessRepository)

    status = asyncio.run(
        manager._process_job(
            "job_risk",
            "risk.json",
            b"{}",
            "chat",
            "chat_support",
            {},
        )
    )

    assert status == "completed"
    assert len(_FakeRiskDispatcher.calls) == 1
    call = _FakeRiskDispatcher.calls[0]
    assert call["job_id"] == "job_risk"
    assert call["conversation_id"] == 9
    assert call["utterances"][0]["utterance_id"] == 30
    assert call["utterances"][0]["urgency"] == "high"
