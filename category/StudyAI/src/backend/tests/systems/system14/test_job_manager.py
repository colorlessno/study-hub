from __future__ import annotations

import asyncio

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
