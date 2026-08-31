from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.auth.dependencies import require_authenticated
from studyai.common.auth.models import AuthenticatedUser
from studyai.common.db.session import get_db_session
from studyai.common.errors.models import ValidationAppError
from studyai.systems.system09.schemas.research import (
    ReportDetailResponse,
    ReportExportResponse,
    ReportFilterParams,
    ReportListResponse,
    ResearchRequest,
    ResearchResponse,
)
from studyai.systems.system09.services.research_service import ResearchService

router = APIRouter()


@router.post("/research", response_model=ResearchResponse)
async def start_research(
    body: ResearchRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> ResearchResponse:
    return await ResearchService().run_research(
        session,
        body=body,
        trace_id=request.state.trace_id,
        user_id=current_user.user_id,
    )


@router.get("/reports", response_model=ReportListResponse)
async def list_reports(
    research_type: str | None = None,
    target: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> ReportListResponse:
    try:
        filters = ReportFilterParams(
            research_type=research_type,
            target=target,
            from_date=from_date,
            to_date=to_date,
        )
    except Exception as exc:  # pydantic validation
        raise ValidationAppError("invalid_report_filters", "Report filters are invalid.") from exc
    return await ResearchService().list_reports(session, filters)


@router.get("/reports/{report_id}", response_model=ReportDetailResponse)
async def get_report(
    report_id: int,
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> ReportDetailResponse:
    return await ResearchService().get_report(session, report_id)


@router.get("/reports/{report_id}/export", response_model=ReportExportResponse)
async def export_report(
    report_id: int,
    format: str = Query(default="markdown"),
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> ReportExportResponse:
    if format != "markdown":
        raise ValidationAppError("invalid_export_format", "Only markdown export is supported.")
    return await ResearchService().export_report(session, report_id)
