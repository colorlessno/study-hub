from __future__ import annotations

import os
import secrets
from datetime import date

from fastapi import APIRouter, Depends, File, Form, Header, Query, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.auth.dependencies import require_authenticated, require_roles
from studyai.common.auth.models import AuthenticatedUser
from studyai.common.db.session import get_db_session
from studyai.common.errors.models import AppError, ValidationAppError
from studyai.systems.system14.schemas.insight import (
    ActionProposalResponse,
    AgentChatRequest,
    AgentChatResponse,
    DashboardResponse,
    DummyCrmActivityCreate,
    DummyCrmActivityListResponse,
    DummyCrmActivityResponse,
    DummyCrmActivityStatus,
    DummyCrmActivityUpdate,
    DummyCrmUpsertResponse,
    FAQGapResponse,
    JobStatusResponse,
    SalesScoreResponse,
    UploadAcceptedResponse,
    VoiceRankingResponse,
    WinLossResponse,
    WorkflowCreateRequest,
    WorkflowCreateResponse,
)
from studyai.systems.system14.services.agent_chat_service import AgentChatService
from studyai.systems.system14.services.dummy_crm_service import DummyCrmService
from studyai.systems.system14.services.insight_query_service import InsightQueryService
from studyai.systems.system14.services.job_manager import JobManager
from studyai.systems.system14.services.workflow_dispatcher import WorkflowDispatcher

router = APIRouter()


def _require_dummy_crm_token(
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> None:
    expected = os.environ.get("SYSTEM14_DUMMY_CRM_TOKEN", "").strip()
    if not expected:
        raise AppError(
            "dummy_crm_not_configured",
            "SYSTEM14_DUMMY_CRM_TOKEN is not configured.",
            503,
        )
    scheme, separator, token = (authorization or "").partition(" ")
    if separator != " " or scheme.lower() != "bearer" or not secrets.compare_digest(token, expected):
        raise AppError(
            "dummy_crm_authentication_failed",
            "A valid dummy CRM bearer token is required.",
            401,
        )


@router.post("/data/upload", response_model=UploadAcceptedResponse)
async def upload_data(
    file: UploadFile = File(...),
    data_type: str = Form(...),
    source: str = Form(...),
    metadata: str | None = Form(default=None),
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> UploadAcceptedResponse:
    return await JobManager().upload_data(
        session,
        file_name=file.filename or "upload.txt",
        file_bytes=await file.read(),
        data_type=data_type,
        source=source,
        metadata_raw=metadata,
    )


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job(
    job_id: str,
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> JobStatusResponse:
    return await JobManager().get_job(session, job_id=job_id)


@router.get("/insights/voice-ranking", response_model=VoiceRankingResponse)
async def get_voice_ranking(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    product: str | None = Query(default=None),
    call_reason: str | None = Query(default=None),
    sentiment: str | None = Query(default=None),
    utterance_type: str | None = Query(default=None, alias="type"),
    limit: int = Query(default=20, ge=1, le=100),
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> VoiceRankingResponse:
    _validate_date_range(from_date, to_date)
    return await InsightQueryService().get_voice_ranking(
        session,
        from_date=from_date,
        to_date=to_date,
        product=product,
        call_reason=call_reason,
        sentiment=sentiment,
        utterance_type=utterance_type,
        limit=limit,
    )


@router.get("/insights/sales-score", response_model=SalesScoreResponse)
async def get_sales_score(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    staff_id: str | None = Query(default=None),
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> SalesScoreResponse:
    _validate_date_range(from_date, to_date)
    return await InsightQueryService().get_sales_score(
        session,
        from_date=from_date,
        to_date=to_date,
        staff_id=staff_id,
    )


@router.get("/insights/win-loss", response_model=WinLossResponse)
async def get_win_loss(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> WinLossResponse:
    _validate_date_range(from_date, to_date)
    return await InsightQueryService().get_win_loss(
        session,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
    )


@router.post("/workflows", response_model=WorkflowCreateResponse)
async def create_workflow(
    body: WorkflowCreateRequest,
    _: AuthenticatedUser = Depends(require_roles("admin", "manager")),
    session: AsyncSession = Depends(get_db_session),
) -> WorkflowCreateResponse:
    return await WorkflowDispatcher().create_workflow(session, body=body)


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> DashboardResponse:
    return await InsightQueryService().get_dashboard(session)


@router.post("/agent/chat", response_model=AgentChatResponse)
async def agent_chat(
    body: AgentChatRequest,
    _request: Request,
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> AgentChatResponse:
    return await AgentChatService().answer_agent_query(session, body=body)


@router.get("/agent/action-proposals", response_model=ActionProposalResponse)
async def get_action_proposals(
    product: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> ActionProposalResponse:
    _validate_date_range(from_date, to_date)
    return await InsightQueryService().get_action_proposals(
        session,
        product=product,
        priority=priority,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/agent/faq-gaps", response_model=FAQGapResponse)
async def get_faq_gaps(
    product: str | None = Query(default=None),
    limit: int = Query(default=10, ge=1, le=100),
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> FAQGapResponse:
    return await InsightQueryService().get_faq_gaps(session, product=product, limit=limit)


@router.post("/dummy-crm/activities", response_model=DummyCrmUpsertResponse)
async def upsert_dummy_crm_activity(
    body: DummyCrmActivityCreate,
    _: None = Depends(_require_dummy_crm_token),
    session: AsyncSession = Depends(get_db_session),
) -> DummyCrmUpsertResponse:
    return await DummyCrmService().upsert_activity(session, body=body)


@router.get("/dummy-crm/activities", response_model=DummyCrmActivityListResponse)
async def list_dummy_crm_activities(
    status: DummyCrmActivityStatus | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> DummyCrmActivityListResponse:
    return await DummyCrmService().list_activities(
        session,
        status=status,
        limit=limit,
    )


@router.get("/dummy-crm/activities/{activity_id}", response_model=DummyCrmActivityResponse)
async def get_dummy_crm_activity(
    activity_id: int,
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> DummyCrmActivityResponse:
    return await DummyCrmService().get_activity(session, activity_id=activity_id)


@router.patch("/dummy-crm/activities/{activity_id}", response_model=DummyCrmActivityResponse)
async def update_dummy_crm_activity(
    activity_id: int,
    body: DummyCrmActivityUpdate,
    _: AuthenticatedUser = Depends(require_roles("admin", "manager")),
    session: AsyncSession = Depends(get_db_session),
) -> DummyCrmActivityResponse:
    return await DummyCrmService().update_activity(
        session,
        activity_id=activity_id,
        body=body,
    )


def _validate_date_range(from_date: date | None, to_date: date | None) -> None:
    if from_date and to_date and from_date > to_date:
        raise ValidationAppError("invalid_date_range", "from_date must be less than or equal to to_date.")
