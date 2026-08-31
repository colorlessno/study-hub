from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.db.session import get_db_session
from studyai.systems.system07.schemas.catalog import (
    AccessStatsResponse,
    BulkDocumentUploadResponse,
    DocumentDetailResponse,
    DocumentListResponse,
    DocumentUploadResponse,
    SimilarDocumentsResponse,
    TagListResponse,
    TagMergeRequest,
    TagMergeResponse,
    UpdateTagsRequest,
    UpdateTagsResponse,
    UnusedDocumentsResponse,
)
from studyai.systems.system07.services.analytics_service import AnalyticsService
from studyai.systems.system07.services.catalog_service import CatalogService
from studyai.systems.system07.services.tag_admin_service import TagAdminService

router = APIRouter()


@router.post("/documents", response_model=DocumentUploadResponse)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    registered_by: str = Form(...),
    access_roles: str | None = Form(default=None),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentUploadResponse:
    service = CatalogService()
    file_bytes = await file.read()
    return await service.upload_document(
        session,
        file_name=file.filename or "document",
        file_bytes=file_bytes,
        registered_by=registered_by,
        access_roles=service.parse_access_roles(access_roles),
        trace_id=request.state.trace_id,
    )


@router.post("/documents/bulk", response_model=BulkDocumentUploadResponse)
async def upload_documents_bulk(
    request: Request,
    files: list[UploadFile] = File(...),
    registered_by: str = Form(...),
    access_roles: str | None = Form(default=None),
    session: AsyncSession = Depends(get_db_session),
) -> BulkDocumentUploadResponse:
    service = CatalogService()
    prepared_files: list[tuple[str, bytes]] = []
    for file in files:
        prepared_files.append((file.filename or "document", await file.read()))
    return await service.upload_documents_bulk(
        session,
        files=prepared_files,
        registered_by=registered_by,
        access_roles=service.parse_access_roles(access_roles),
        trace_id=request.state.trace_id,
    )


@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(
    request: Request,
    keyword: str | None = None,
    category: str | None = None,
    tags: str | None = None,
    document_type: str | None = None,
    importance: str | None = None,
    registered_by: str | None = None,
    search_mode: str = Query(default="hybrid"),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentListResponse:
    service = CatalogService()
    return await service.list_documents(
        session,
        keyword=keyword,
        category=category,
        tags=service.parse_tags(tags),
        document_type=document_type,
        importance=importance,
        registered_by=registered_by,
        search_mode=search_mode,
        user=request.state.current_user,
        trace_id=request.state.trace_id,
    )


@router.get("/documents/{document_id}", response_model=DocumentDetailResponse)
async def get_document_detail(
    document_id: int,
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> DocumentDetailResponse:
    return await CatalogService().get_document_detail(
        session,
        document_id=document_id,
        user=request.state.current_user,
        trace_id=request.state.trace_id,
    )


@router.get("/documents/{document_id}/similar", response_model=SimilarDocumentsResponse)
async def get_similar_documents(
    document_id: int,
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> SimilarDocumentsResponse:
    return await CatalogService().get_similar_documents(
        session,
        document_id=document_id,
        user=request.state.current_user,
        trace_id=request.state.trace_id,
    )


@router.put("/documents/{document_id}/tags", response_model=UpdateTagsResponse)
async def update_document_tags(
    document_id: int,
    body: UpdateTagsRequest,
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> UpdateTagsResponse:
    return await TagAdminService().update_tags(
        session,
        document_id=document_id,
        tags=body.tags,
        category=body.category,
        sub_category=body.sub_category,
        importance=body.importance,
        user_id=CatalogService._resolve_user_id(request.state.current_user),
        trace_id=request.state.trace_id,
    )


@router.get("/tags", response_model=TagListResponse)
async def list_tags(session: AsyncSession = Depends(get_db_session)) -> TagListResponse:
    return await TagAdminService().list_tags(session)


@router.post("/tags/merge", response_model=TagMergeResponse)
async def merge_tags(
    body: TagMergeRequest,
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> TagMergeResponse:
    return await TagAdminService().merge_tags(
        session,
        source_tags=body.source_tags,
        target_tag=body.target_tag,
        user_id=CatalogService._resolve_user_id(request.state.current_user),
        trace_id=request.state.trace_id,
    )


@router.get("/stats/access", response_model=AccessStatsResponse)
async def get_access_stats(
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
) -> AccessStatsResponse:
    return await AnalyticsService().get_access_stats(
        session,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
    )


@router.get("/stats/unused-documents", response_model=UnusedDocumentsResponse)
async def get_unused_documents(
    before_date: datetime | None = None,
    session: AsyncSession = Depends(get_db_session),
) -> UnusedDocumentsResponse:
    return await AnalyticsService().get_unused_documents(session, before_date=before_date)
