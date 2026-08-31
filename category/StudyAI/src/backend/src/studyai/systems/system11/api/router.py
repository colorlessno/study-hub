from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.db.session import get_db_session
from studyai.systems.system11.schemas.organizer import (
    ExecuteRequest,
    ExecuteResponse,
    ExecutionListResponse,
    ExecutionReportResponse,
    RollbackResponse,
    SampleWorkspaceResponse,
    ScanRequest,
    ScanResponse,
    SettingsRequest,
    SettingsResponse,
)
from studyai.systems.system11.services.organizer_service import OrganizerOrchestrator

router = APIRouter()


@router.post("/sample/reset", response_model=SampleWorkspaceResponse)
async def reset_sample_workspace() -> SampleWorkspaceResponse:
    return OrganizerOrchestrator().reset_sample_workspace()


@router.post("/scan", response_model=ScanResponse)
async def scan(
    req: ScanRequest,
    session: AsyncSession = Depends(get_db_session),
) -> ScanResponse:
    return await OrganizerOrchestrator().scan(session, req)


@router.post("/execute", response_model=ExecuteResponse)
async def execute(
    req: ExecuteRequest,
    session: AsyncSession = Depends(get_db_session),
) -> ExecuteResponse:
    return await OrganizerOrchestrator().execute(session, req)


@router.post("/rollback/{execution_id}", response_model=RollbackResponse)
async def rollback(
    execution_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> RollbackResponse:
    return await OrganizerOrchestrator().rollback(session, execution_id)


@router.get("/executions", response_model=ExecutionListResponse)
async def list_executions(
    session: AsyncSession = Depends(get_db_session),
) -> ExecutionListResponse:
    return await OrganizerOrchestrator().list_executions(session)


@router.get("/executions/{execution_id}/report", response_model=ExecutionReportResponse)
async def get_report(
    execution_id: str,
    session: AsyncSession = Depends(get_db_session),
) -> ExecutionReportResponse:
    return await OrganizerOrchestrator().get_report(session, execution_id)


@router.post("/settings", response_model=SettingsResponse)
async def save_settings(
    req: SettingsRequest,
    session: AsyncSession = Depends(get_db_session),
) -> SettingsResponse:
    return await OrganizerOrchestrator().save_settings(session, req)
