from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.auth.dependencies import require_authenticated
from studyai.common.auth.models import AuthenticatedUser
from studyai.common.db.session import get_db_session
from studyai.systems.system02.schemas.review import (
    CompareResponse,
    ReviewCompareResponse,
    ReviewDetailResponse,
    ReviewListResponse,
    ReviewResponse,
)
from studyai.systems.system02.services.review_service import ReviewService

router = APIRouter()


@router.post("/review", response_model=ReviewResponse)
async def review_document(
    request: Request,
    file: UploadFile = File(...),
    perspective: str = Form(...),
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> ReviewResponse:
    return await ReviewService().review_document(
        session,
        file_name=file.filename or "",
        file_bytes=await file.read(),
        perspective=perspective,
        trace_id=request.state.trace_id,
        user_id=current_user.user_id,
    )


@router.post("/compare", response_model=CompareResponse)
async def compare_documents(
    request: Request,
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...),
    perspective: str = Form(...),
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> CompareResponse:
    return await ReviewService().compare_documents(
        session,
        file_name_a=file_a.filename or "",
        file_bytes_a=await file_a.read(),
        file_name_b=file_b.filename or "",
        file_bytes_b=await file_b.read(),
        perspective=perspective,
        trace_id=request.state.trace_id,
        user_id=current_user.user_id,
    )


@router.get("/reviews", response_model=ReviewListResponse)
async def list_reviews(
    document_type: str | None = None,
    overall_risk: str | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> ReviewListResponse:
    return await ReviewService().list_reviews(
        session,
        document_type=document_type,
        overall_risk=overall_risk,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/reviews/compare", response_model=ReviewCompareResponse)
async def compare_reviews(
    review_id_a: int,
    review_id_b: int,
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> ReviewCompareResponse:
    return await ReviewService().compare_saved_reviews(
        session,
        review_id_a=review_id_a,
        review_id_b=review_id_b,
    )


@router.get("/reviews/{review_id}", response_model=ReviewDetailResponse)
async def get_review(
    review_id: int,
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> ReviewDetailResponse:
    return await ReviewService().get_review(session, review_id=review_id)
