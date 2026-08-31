from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.db.session import get_db_session
from studyai.systems.system03.schemas.qa import (
    AskRequest,
    AskResponse,
    DocumentDeleteResponse,
    DocumentListResponse,
    DocumentRegisterResponse,
    FeedbackRequest,
    FeedbackResponse,
    PopularQuestionsResponse,
    UnansweredQuestionsResponse,
)
from studyai.systems.system03.services.analytics_service import AnalyticsService
from studyai.systems.system03.services.ask_service import AskService
from studyai.systems.system03.services.document_service import DocumentService

router = APIRouter()


@router.post("/ask", response_model=AskResponse)
async def ask_question(
    request: AskRequest,
    session: AsyncSession = Depends(get_db_session),
) -> AskResponse:
    return await AskService().ask(session, request)


@router.post("/ask/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    request: FeedbackRequest,
    session: AsyncSession = Depends(get_db_session),
) -> FeedbackResponse:
    return await AskService().submit_feedback(session, request)


@router.post("/documents", response_model=DocumentRegisterResponse)
async def register_document(
    project_id: str = Form(...),
    category: str = Form(...),
    version: str | None = Form(default=None),
    access_roles: str | None = Form(default=None),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentRegisterResponse:
    service = DocumentService()
    file_bytes = await file.read()
    return await service.register_document(
        session,
        project_id=project_id,
        file_name=file.filename or "document",
        file_bytes=file_bytes,
        category=category,
        version=version,
        access_roles=service.parse_access_roles(access_roles),
    )


@router.put("/documents/{document_id}", response_model=DocumentRegisterResponse)
async def update_document(
    document_id: int,
    category: str = Form(...),
    version: str | None = Form(default=None),
    access_roles: str | None = Form(default=None),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db_session),
) -> DocumentRegisterResponse:
    service = DocumentService()
    file_bytes = await file.read()
    return await service.update_document(
        session,
        document_id=document_id,
        file_name=file.filename or "document",
        file_bytes=file_bytes,
        category=category,
        version=version,
        access_roles=service.parse_access_roles(access_roles),
    )


@router.delete("/documents/{document_id}", response_model=DocumentDeleteResponse)
async def delete_document(
    document_id: int,
    session: AsyncSession = Depends(get_db_session),
) -> DocumentDeleteResponse:
    result = await DocumentService().delete_document(session, document_id)
    return DocumentDeleteResponse(**result)


@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(
    project_id: str | None = None,
    category: str | None = None,
    include_inactive: bool = False,
    session: AsyncSession = Depends(get_db_session),
) -> DocumentListResponse:
    return await DocumentService().list_documents(
        session,
        project_id=project_id,
        category=category,
        include_inactive=include_inactive,
    )


@router.get("/analytics/popular-questions", response_model=PopularQuestionsResponse)
async def popular_questions(
    project_id: str | None = None,
    limit: int = Query(default=10, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
) -> PopularQuestionsResponse:
    return await AnalyticsService().get_popular_questions(session, project_id=project_id, limit=limit)


@router.get("/analytics/unanswered-questions", response_model=UnansweredQuestionsResponse)
async def unanswered_questions(
    project_id: str | None = None,
    limit: int = Query(default=10, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
) -> UnansweredQuestionsResponse:
    return await AnalyticsService().get_unanswered_questions(session, project_id=project_id, limit=limit)
