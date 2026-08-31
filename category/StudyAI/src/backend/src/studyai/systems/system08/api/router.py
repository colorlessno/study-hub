from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.auth.dependencies import require_authenticated
from studyai.common.auth.models import AuthenticatedUser
from studyai.common.db.session import get_db_session
from studyai.systems.system08.schemas.analysis import (
    AnalysisCreateRequest,
    AnalysisExportResponse,
    AnalysisListResponse,
    AnalysisResponse,
    TaskStatusUpdateRequest,
    TaskStatusUpdateResponse,
)
from studyai.systems.system08.services.analysis_service import AnalysisService

router = APIRouter()


@router.post("/analyze", response_model=AnalysisResponse)
async def start_analysis(
    body: AnalysisCreateRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> AnalysisResponse:
    return await AnalysisService().start_analysis(
        session,
        body=body,
        trace_id=request.state.trace_id,
        user_id=current_user.user_id,
    )


@router.get("/analyses", response_model=AnalysisListResponse)
async def list_analyses(
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> AnalysisListResponse:
    return await AnalysisService().list_analyses(session)


@router.get("/analyses/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(
    analysis_id: int,
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> AnalysisResponse:
    return await AnalysisService().get_analysis(session, analysis_id)


@router.patch("/analyses/{analysis_id}/tasks/{task_id}", response_model=TaskStatusUpdateResponse)
async def update_task_status(
    analysis_id: int,
    task_id: int,
    body: TaskStatusUpdateRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> TaskStatusUpdateResponse:
    return await AnalysisService().update_task_status(
        session,
        analysis_id=analysis_id,
        task_id=task_id,
        body=body,
        trace_id=request.state.trace_id,
        user_id=current_user.user_id,
    )


@router.get("/analyses/{analysis_id}/export", response_model=AnalysisExportResponse)
async def export_analysis(
    analysis_id: int,
    format: str = Query(default="markdown"),
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> AnalysisExportResponse:
    return await AnalysisService().export_analysis(
        session,
        analysis_id=analysis_id,
        format=format,
    )
