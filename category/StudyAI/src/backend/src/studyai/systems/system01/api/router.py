from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request, UploadFile
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.db.session import get_db_session
from studyai.common.errors.models import AppError, ValidationAppError
from studyai.systems.system01.schemas.extract import (
    BulkExtractAcceptedResponse,
    BulkJobStatusResponse,
    CorrectionRequest,
    CorrectionResponse,
    DocumentListResponse,
    ExtractResponse,
)
from studyai.systems.system01.services.bulk_service import BulkService
from studyai.systems.system01.services.csv_exporter import CSVExporter
from studyai.systems.system01.services.extract_service import ExtractService

router = APIRouter()


@router.post("/extract", response_model=ExtractResponse)
async def extract_document(
    request: Request,
    file: UploadFile,
    session: AsyncSession = Depends(get_db_session),
) -> ExtractResponse:
    service = ExtractService()
    return await service.run_single_extract(session, file, trace_id=request.state.trace_id)


@router.post("/extract/bulk", response_model=BulkExtractAcceptedResponse, status_code=202)
async def extract_bulk(
    request: Request,
    background_tasks: BackgroundTasks,
    files: list[UploadFile],
    session: AsyncSession = Depends(get_db_session),
) -> BulkExtractAcceptedResponse:
    if not 1 <= len(files) <= 5:
        raise AppError("invalid_bulk_file_count", "一括抽出は 1〜5 件で指定してください。", 400)
    service = BulkService()
    return await service.enqueue(
        session,
        files,
        background_tasks,
        trace_id=request.state.trace_id,
    )


@router.get("/extract/bulk/{job_id}", response_model=BulkJobStatusResponse)
async def get_bulk_result(job_id: str, session: AsyncSession = Depends(get_db_session)) -> BulkJobStatusResponse:
    service = BulkService()
    return await service.get_status(session, job_id)


@router.patch("/documents/{document_id}/correct", response_model=CorrectionResponse)
async def correct_document(
    request: Request,
    document_id: int,
    correction: CorrectionRequest,
    session: AsyncSession = Depends(get_db_session),
) -> CorrectionResponse:
    service = ExtractService()
    return await service.correct_document(
        session,
        document_id,
        correction,
        trace_id=request.state.trace_id,
    )


@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(
    date_from: date | None = None,
    date_to: date | None = None,
    supplier: str | None = None,
    min_amount: int | None = None,
    max_amount: int | None = None,
    document_type: str | None = None,
    requires_review: bool | None = None,
    review_status: Literal["未確認", "確認済み"] | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentListResponse:
    if date_from and date_to and date_from > date_to:
        raise ValidationAppError("invalid_date_range", "date_from は date_to 以下で指定してください。")
    service = ExtractService()
    return await service.list_documents(
        session,
        date_from=date_from,
        date_to=date_to,
        supplier=supplier,
        min_amount=min_amount,
        max_amount=max_amount,
        document_type=document_type,
        requires_review=requires_review,
        review_status=review_status,
        page=page,
        per_page=per_page,
    )


@router.get("/documents/export")
async def export_documents(
    date_from: date | None = None,
    date_to: date | None = None,
    supplier: str | None = None,
    min_amount: int | None = None,
    max_amount: int | None = None,
    document_type: str | None = None,
    requires_review: bool | None = None,
    review_status: Literal["未確認", "確認済み"] = "確認済み",
    session: AsyncSession = Depends(get_db_session),
) -> Response:
    service = ExtractService()
    result = await service.list_documents(
        session,
        date_from=date_from,
        date_to=date_to,
        supplier=supplier,
        min_amount=min_amount,
        max_amount=max_amount,
        document_type=document_type,
        requires_review=requires_review,
        review_status=review_status,
        page=1,
        per_page=10000,
    )
    csv_text = CSVExporter().export(result)
    return Response(
        content=csv_text.encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": 'attachment; filename="documents_export.csv"'},
    )
