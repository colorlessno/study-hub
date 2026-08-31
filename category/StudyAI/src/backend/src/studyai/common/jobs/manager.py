from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock
from uuid import uuid4

from studyai.common.errors.models import NotFoundAppError


@dataclass(slots=True)
class JobRecord:
    job_id: str
    job_type: str
    status: str
    payload: dict = field(default_factory=dict)
    result: dict | None = None
    error: dict | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class InMemoryJobManager:
    def __init__(self) -> None:
        self._jobs: dict[str, JobRecord] = {}
        self._lock = Lock()

    def create_job(self, job_type: str, payload: dict | None = None) -> JobRecord:
        record = JobRecord(
            job_id=f"job_{uuid4().hex}",
            job_type=job_type,
            status="queued",
            payload=payload or {},
        )
        with self._lock:
            self._jobs[record.job_id] = record
        return record

    def start_job(self, job_id: str) -> JobRecord:
        return self.update_job(job_id, status="running")

    def complete_job(self, job_id: str, result: dict | None = None) -> JobRecord:
        return self.update_job(job_id, status="completed", result=result or {})

    def fail_job(self, job_id: str, error: dict | None = None) -> JobRecord:
        return self.update_job(job_id, status="failed", error=error or {})

    def update_job(
        self,
        job_id: str,
        *,
        status: str | None = None,
        result: dict | None = None,
        error: dict | None = None,
    ) -> JobRecord:
        with self._lock:
            record = self._jobs.get(job_id)
            if record is None:
                raise NotFoundAppError("job_not_found", "対象のジョブが見つかりません。")
            if status is not None:
                record.status = status
            if result is not None:
                record.result = result
            if error is not None:
                record.error = error
            record.updated_at = datetime.now(timezone.utc)
            return record

    def get_job(self, job_id: str) -> JobRecord:
        with self._lock:
            record = self._jobs.get(job_id)
            if record is None:
                raise NotFoundAppError("job_not_found", "対象のジョブが見つかりません。")
            return record

    def list_jobs(self, *, job_type: str | None = None) -> list[JobRecord]:
        with self._lock:
            jobs = list(self._jobs.values())
        if job_type:
            jobs = [job for job in jobs if job.job_type == job_type]
        return sorted(jobs, key=lambda job: job.created_at, reverse=True)


_job_manager = InMemoryJobManager()


def get_job_manager() -> InMemoryJobManager:
    return _job_manager
