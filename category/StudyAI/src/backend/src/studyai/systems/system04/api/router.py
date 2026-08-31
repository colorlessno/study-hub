from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.auth.dependencies import require_authenticated
from studyai.common.auth.models import AuthenticatedUser
from studyai.common.db.session import get_db_session
from studyai.common.errors.models import ValidationAppError
from studyai.systems.system04.schemas.analysis import (
    AnalysisDetailResponse,
    AnalysisListResponse,
    AnalyzeRequest,
    AnalyzeResponse,
    CompareRequest,
    CompareResponse,
)
from studyai.systems.system04.services.review_analysis_service import ReviewAnalysisService

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_reviews(
    body: AnalyzeRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> AnalyzeResponse:
    return await ReviewAnalysisService().analyze(
        session,
        body=body,
        trace_id=request.state.trace_id,
        user_id=current_user.user_id,
    )


@router.post("/analyze/file", response_model=AnalyzeResponse)
async def analyze_review_file(
    request: Request,
    file: UploadFile = File(...),
    product_name: str | None = Form(default=None),
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> AnalyzeResponse:
    file_bytes = await file.read()
    return await ReviewAnalysisService().analyze_file(
        session,
        file_name=file.filename or "reviews.csv",
        file_bytes=file_bytes,
        product_name=product_name,
        trace_id=request.state.trace_id,
        user_id=current_user.user_id,
    )


@router.post("/compare", response_model=CompareResponse)
async def compare_reviews(
    body: CompareRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> CompareResponse:
    return await ReviewAnalysisService().compare(
        session,
        body=body,
        trace_id=request.state.trace_id,
        user_id=current_user.user_id,
    )


@router.get("/analyses", response_model=AnalysisListResponse)
async def list_analyses(
    product_name: str | None = None,
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> AnalysisListResponse:
    try:
        return await ReviewAnalysisService().list_analyses(
            session,
            product_name=product_name,
            from_date=from_date,
            to_date=to_date,
        )
    except ValueError as exc:
        raise ValidationAppError("invalid_analysis_filters", "Analysis filters are invalid.") from exc


@router.get("/analyses/{analysis_id}", response_model=AnalysisDetailResponse)
async def get_analysis(
    analysis_id: int,
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> AnalysisDetailResponse:
    return await ReviewAnalysisService().get_analysis(session, analysis_id=analysis_id)
