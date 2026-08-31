from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.db.session import get_db_session
from studyai.systems.system10.schemas.indexing import (
    DuplicateGroupResponse,
    FolderMapResponse,
    ReportResponse,
    ScanLogsResponse,
    ScanRequest,
    ScanResponse,
    SearchResponse,
)
from studyai.systems.system10.services.indexing_service import IndexingService

router = APIRouter()


@router.post("/scan", response_model=ScanResponse)
async def scan_files(
    body: ScanRequest,
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> ScanResponse:
    return await IndexingService().scan(
        session,
        body=body,
        trace_id=request.state.trace_id,
        user_id=request.state.current_user.user_id if request.state.current_user else "anonymous",
    )


@router.get("/search", response_model=SearchResponse)
async def search_documents(
    q: str,
    search_mode: str = Query(default="hybrid"),
    folder: str | None = None,
    latest_only: bool = False,
    session: AsyncSession = Depends(get_db_session),
) -> SearchResponse:
    return await IndexingService().search(
        session,
        query=q,
        search_mode=search_mode,
        path_prefix=folder,
        latest_only=latest_only,
    )


@router.get("/map", response_model=FolderMapResponse)
async def get_folder_map(
    folder: str | None = None,
    session: AsyncSession = Depends(get_db_session),
) -> FolderMapResponse:
    return await IndexingService().get_map(session, folder=folder)


@router.get("/report", response_model=ReportResponse)
async def get_report(
    folder: str | None = None,
    session: AsyncSession = Depends(get_db_session),
) -> ReportResponse:
    return await IndexingService().get_report(session, folder=folder)


@router.get("/duplicates", response_model=DuplicateGroupResponse)
async def get_duplicates(session: AsyncSession = Depends(get_db_session)) -> DuplicateGroupResponse:
    return await IndexingService().get_duplicates(session)


@router.get("/scans", response_model=ScanLogsResponse)
async def get_scans(session: AsyncSession = Depends(get_db_session)) -> ScanLogsResponse:
    return await IndexingService().get_scan_logs(session)
