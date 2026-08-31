from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.errors.models import NotFoundAppError
from studyai.systems.system01.models.document import ExtractJob, ExtractJobResult


class JobRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_job(self, job_id: str, total_files: int) -> ExtractJob:
        job = ExtractJob(id=job_id, status="queued", total_files=total_files)
        self.session.add(job)
        await self.session.flush()
        return job

    async def get_job(self, job_id: str) -> ExtractJob:
        result = await self.session.execute(select(ExtractJob).where(ExtractJob.id == job_id))
        job = result.scalar_one_or_none()
        if job is None:
            raise NotFoundAppError("job_not_found", "対象のジョブが存在しません。")
        return job

    async def mark_running(self, job_id: str) -> ExtractJob:
        job = await self.get_job(job_id)
        job.status = "running"
        await self.session.flush()
        return job

    async def add_result(self, *, job_id: str, file_name: str, status: str, document_id: int | None = None, error_code: str | None = None, message: str | None = None) -> ExtractJobResult:
        result = ExtractJobResult(
            job_id=job_id,
            file_name=file_name,
            status=status,
            document_id=document_id,
            error_code=error_code,
            message=message,
        )
        self.session.add(result)
        await self.session.flush()
        return result

    async def finalize(self, job_id: str, succeeded: int, failed: int) -> ExtractJob:
        job = await self.get_job(job_id)
        job.succeeded = succeeded
        job.failed = failed
        job.completed_at = datetime.utcnow()
        if succeeded and failed:
            job.status = "partial"
        elif failed and not succeeded:
            job.status = "failed"
        else:
            job.status = "completed"
        await self.session.flush()
        return job
