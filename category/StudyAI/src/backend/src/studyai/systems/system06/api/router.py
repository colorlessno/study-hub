from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.auth.dependencies import require_authenticated, require_roles
from studyai.common.auth.models import AuthenticatedUser
from studyai.common.db.session import get_db_session
from studyai.systems.system06.schemas.support import (
    FAQCreateRequest,
    FAQCreateResponse,
    FAQImportResponse,
    InquiryCreateRequest,
    InquiryCreateResponse,
    InquiryFeedbackRequest,
    InquiryFeedbackResponse,
    InquiryListResponse,
    InquiryStatusUpdateRequest,
    InquiryStatusUpdateResponse,
    StatsSummaryResponse,
)
from studyai.systems.system06.services.faq_admin_service import FAQAdminService
from studyai.systems.system06.services.inquiry_service import InquiryService
from studyai.systems.system06.services.stats_service import StatsService

router = APIRouter()


@router.post("/inquiries", response_model=InquiryCreateResponse)
async def create_inquiry(
    body: InquiryCreateRequest,
    request: Request,
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> InquiryCreateResponse:
    return await InquiryService().create_inquiry(
        session,
        body=body,
        trace_id=request.state.trace_id,
    )


@router.post("/inquiries/{inquiry_id}/feedback", response_model=InquiryFeedbackResponse)
async def submit_feedback(
    inquiry_id: int,
    body: InquiryFeedbackRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> InquiryFeedbackResponse:
    return await InquiryService().submit_feedback(
        session,
        inquiry_id=inquiry_id,
        body=body,
        trace_id=request.state.trace_id,
        user_id=current_user.user_id,
    )


@router.patch("/inquiries/{inquiry_id}/status", response_model=InquiryStatusUpdateResponse)
async def update_status(
    inquiry_id: int,
    body: InquiryStatusUpdateRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_roles("admin", "support_agent", "support_manager")),
    session: AsyncSession = Depends(get_db_session),
) -> InquiryStatusUpdateResponse:
    return await InquiryService().update_status(
        session,
        inquiry_id=inquiry_id,
        body=body,
        trace_id=request.state.trace_id,
        user_id=current_user.user_id,
    )


@router.post("/faq", response_model=FAQCreateResponse)
async def create_faq(
    body: FAQCreateRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_roles("admin", "faq_admin", "support_manager")),
    session: AsyncSession = Depends(get_db_session),
) -> FAQCreateResponse:
    return await FAQAdminService().create_faq(
        session,
        body=body,
        trace_id=request.state.trace_id,
        user_id=current_user.user_id,
    )


@router.post("/faq/import", response_model=FAQImportResponse)
async def import_faqs(
    request: Request,
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(require_roles("admin", "faq_admin", "support_manager")),
    session: AsyncSession = Depends(get_db_session),
) -> FAQImportResponse:
    file_bytes = await file.read()
    return await FAQAdminService().import_faqs(
        session,
        file_name=file.filename,
        file_bytes=file_bytes,
        trace_id=request.state.trace_id,
        user_id=current_user.user_id,
    )


@router.get("/inquiries", response_model=InquiryListResponse)
async def list_inquiries(
    category: str | None = None,
    priority: str | None = None,
    status: str | None = None,
    escalated: bool | None = None,
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> InquiryListResponse:
    return await InquiryService().list_inquiries(
        session,
        category=category,
        priority=priority,
        status=status,
        escalated=escalated,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/stats/summary", response_model=StatsSummaryResponse)
async def get_stats_summary(
    _: AuthenticatedUser = Depends(require_roles("admin", "faq_admin", "support_manager")),
    session: AsyncSession = Depends(get_db_session),
) -> StatsSummaryResponse:
    return await StatsService().get_summary(session)
