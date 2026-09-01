from __future__ import annotations

import asyncio
from types import SimpleNamespace

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
