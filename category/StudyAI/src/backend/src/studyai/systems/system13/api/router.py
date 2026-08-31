from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.auth.dependencies import require_authenticated, require_roles
from studyai.common.auth.models import AuthenticatedUser
from studyai.common.db.session import get_db_session
from studyai.common.errors.models import AppError
from studyai.systems.system13.schemas.education import (
    AskRequest,
    AskResponse,
    CatchupReportResponse,
    ChecklistResponse,
    ChecklistUpdateRequest,
    ChecklistUpdateResponse,
    DashboardResponse,
    KnowledgeCreateRequest,
    KnowledgeCreateResponse,
    KnowledgeListResponse,
)
from studyai.systems.system13.services.admin_dashboard_service import AdminDashboardService
from studyai.systems.system13.services.ask_service import AskService
from studyai.systems.system13.services.catchup_report_service import CatchupReportService
from studyai.systems.system13.services.checklist_service import ChecklistService
from studyai.systems.system13.services.knowledge_ingestion_service import KnowledgeIngestionService

router = APIRouter()


def _ensure_project_scope(current_user: AuthenticatedUser, project_id: str) -> None:
    allowed_roles = {"admin", "project_admin", "pm"}
    if current_user.project_ids and project_id not in current_user.project_ids and not current_user.has_any_role(allowed_roles):
        raise AppError("cross_project_access_denied", "The user cannot access the requested project.", 403)


def _ensure_user_scope(current_user: AuthenticatedUser, user_id: str) -> None:
    if current_user.user_id == user_id:
        return
    if current_user.has_any_role({"admin", "project_admin", "pm"}):
        return
    raise AppError("cross_user_access_denied", "The user cannot access another member checklist.", 403)


@router.post("/ask", response_model=AskResponse)
async def ask_question(
    body: AskRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> AskResponse:
    _ensure_project_scope(current_user, body.project_id)
    return await AskService().ask(
        session,
        body,
        current_user=current_user,
        trace_id=request.state.trace_id,
    )


@router.get("/catchup-report", response_model=CatchupReportResponse)
async def get_catchup_report(
    project_id: str,
    request: Request,
    user_id: str | None = None,
    role: str | None = None,
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> CatchupReportResponse:
    _ensure_project_scope(current_user, project_id)
    target_user_id = user_id or current_user.user_id or ""
    _ensure_user_scope(current_user, target_user_id)
    return await CatchupReportService().build_report(
        session,
        project_id=project_id,
        user_id=target_user_id,
        role=role or (current_user.roles[0] if current_user.roles else "member"),
    )


@router.post("/knowledge", response_model=KnowledgeCreateResponse)
async def create_knowledge(
    body: KnowledgeCreateRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> KnowledgeCreateResponse:
    _ensure_project_scope(current_user, body.project_id)
    payload = body.model_copy(update={"registered_by": body.registered_by or current_user.user_id})
    return await KnowledgeIngestionService().create_from_text(
        session,
        payload,
        trace_id=request.state.trace_id,
    )


@router.post("/knowledge/file", response_model=KnowledgeCreateResponse)
async def create_knowledge_from_file(
    request: Request,
    project_id: str = Form(...),
    category: str = Form(...),
    importance: str = Form(default="medium"),
    is_landmine: bool = Form(default=False),
    registered_by: str | None = Form(default=None),
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> KnowledgeCreateResponse:
    _ensure_project_scope(current_user, project_id)
    file_bytes = await file.read()
    return await KnowledgeIngestionService().create_from_file(
        session,
        project_id=project_id,
        category=category,
        file_name=file.filename or "knowledge",
        file_bytes=file_bytes,
        importance=importance,
        is_landmine=is_landmine,
        registered_by=registered_by or current_user.user_id,
        trace_id=request.state.trace_id,
    )


@router.get("/knowledge", response_model=KnowledgeListResponse)
async def list_knowledge(
    project_id: str,
    category: str | None = None,
    importance: str | None = None,
    search: str | None = None,
    include_inactive: bool = False,
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> KnowledgeListResponse:
    _ensure_project_scope(current_user, project_id)
    return await KnowledgeIngestionService().list_knowledge(
        session,
        project_id=project_id,
        category=category,
        importance=importance,
        search=search,
        include_inactive=include_inactive,
    )


@router.get("/users/{user_id}/checklist", response_model=ChecklistResponse)
async def get_checklist(
    user_id: str,
    project_id: str = Query(...),
    role: str | None = Query(default=None),
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> ChecklistResponse:
    _ensure_project_scope(current_user, project_id)
    _ensure_user_scope(current_user, user_id)
    return await ChecklistService().get_checklist(
        session,
        project_id=project_id,
        user_id=user_id,
        fallback_role=role or (current_user.roles[0] if current_user.roles else "member"),
    )


@router.patch("/users/{user_id}/checklist/{item_id}", response_model=ChecklistUpdateResponse)
async def update_checklist_item(
    user_id: str,
    item_id: int,
    body: ChecklistUpdateRequest,
    request: Request,
    project_id: str = Query(...),
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> ChecklistUpdateResponse:
    _ensure_project_scope(current_user, project_id)
    _ensure_user_scope(current_user, user_id)
    return await ChecklistService().update_item(
        session,
        project_id=project_id,
        user_id=user_id,
        item_id=item_id,
        status=body.status,
        actor=current_user.user_id,
        trace_id=request.state.trace_id,
    )


@router.get("/admin/dashboard", response_model=DashboardResponse)
async def get_admin_dashboard(
    project_id: str,
    current_user: AuthenticatedUser = Depends(require_roles("admin", "project_admin", "pm")),
    session: AsyncSession = Depends(get_db_session),
) -> DashboardResponse:
    _ensure_project_scope(current_user, project_id)
    return await AdminDashboardService().build_dashboard(session, project_id=project_id)
