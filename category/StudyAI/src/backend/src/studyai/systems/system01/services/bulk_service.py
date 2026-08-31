from __future__ import annotations

import asyncio
import uuid
from decimal import Decimal

from fastapi import BackgroundTasks, UploadFile
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.config.settings import get_settings
from studyai.common.db.session import SessionLocal
from studyai.systems.system01.repositories.job_repository import JobRepository
from studyai.systems.system01.schemas.extract import BulkExtractAcceptedResponse, BulkJobResultResponse, BulkJobStatusResponse
from studyai.systems.system01.services.extract_service import ExtractService


class BulkService:
    def __init__(self) -> None:
        self.extract_service = ExtractService()
        self.settings = get_settings()

    async def enqueue(
        self,
        session: AsyncSession,
        files: list[UploadFile],
        background_tasks: BackgroundTasks,
        *,
        trace_id: str,
    ) -> BulkExtractAcceptedResponse:
        job_id = f"job_{uuid.uuid4().hex[:8]}"
        file_payloads: list[tuple[str, bytes]] = []
        for upload_file in files:
            file_payloads.append((upload_file.filename, await upload_file.read()))
        await JobRepository(session).create_job(job_id, len(files))
        await session.commit()
        background_tasks.add_task(self.process_job, job_id, file_payloads, trace_id)
        return BulkExtractAcceptedResponse(
            job_id=job_id,
            total_files=len(files),
            status="queued",
            results_endpoint=f"/api/extract/bulk/{job_id}",
        )

    async def process_job(
        self,
        job_id: str,
        files: list[tuple[str, bytes]],
        trace_id: str,
    ) -> None:
        async with SessionLocal() as session:
            repo = JobRepository(session)
            await repo.mark_running(job_id)
            await session.commit()

        results: list[bool] = []
        for file_name, file_bytes in files:
            results.append(
                await self._process_file(
                    job_id,
                    file_name,
                    file_bytes,
                    trace_id,
                )
            )
        succeeded = sum(results)
        failed = len(results) - succeeded

        async with SessionLocal() as session:
            await JobRepository(session).finalize(job_id, succeeded, failed)
            await session.commit()

    async def _process_file(
        self,
        job_id: str,
        file_name: str,
        file_bytes: bytes,
        trace_id: str,
    ) -> bool:
        for retry_count in range(4):
            async with SessionLocal() as session:
                try:
                    result = await self.extract_service.run_single_extract_bytes(
                        session,
                        file_name,
                        file_bytes,
                        trace_id=trace_id,
                        job_id=job_id,
                        retry_count=retry_count,
                    )
                    await JobRepository(session).add_result(
                        job_id=job_id,
                        file_name=file_name,
                        status="success",
                        document_id=result.document_id,
                        message="ok",
                    )
                    await session.commit()
                    return True
                except Exception as exc:  # pragma: no cover - background path
                    if self._is_retryable(exc) and retry_count < 3:
                        await asyncio.sleep(2**retry_count)
                        continue
                    await JobRepository(session).add_result(
                        job_id=job_id,
                        file_name=file_name,
                        status="failed",
                        error_code=getattr(exc, "error_code", "extraction_failed"),
                        message=str(exc),
                    )
                    await session.commit()
                    return False
        return False

    @staticmethod
    def _is_retryable(exc: Exception) -> bool:
        return (
            isinstance(exc, ValidationError)
            or getattr(exc, "error_code", "") in {"model_timeout", "invalid_model_output"}
        )

    async def get_status(self, session: AsyncSession, job_id: str) -> BulkJobStatusResponse:
        job = await JobRepository(session).get_job(job_id)
        return BulkJobStatusResponse(
            job_id=job.id,
            status=job.status,
            total_files=job.total_files,
            succeeded=job.succeeded,
            failed=job.failed,
            results=[
                BulkJobResultResponse(
                    file_name=result.file_name,
                    status=result.status,
                    document_id=result.document_id,
                    confidence_score=None,
                    error=result.error_code,
                    message=result.message,
                )
                for result in job.results
            ],
        )
