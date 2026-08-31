from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.auth.dependencies import require_authenticated, require_roles
from studyai.common.auth.models import AuthenticatedUser
from studyai.common.db.session import get_db_session
from studyai.common.errors.models import ValidationAppError
from studyai.systems.system16.schemas.matching import (
    BulkMatchResponse,
    MatchListResponse,
    MatchRequest,
    MatchResponse,
    PastCaseCreateRequest,
    PastCaseCreateResponse,
    SkillsheetParseResponse,
)
from studyai.systems.system16.services.matching_service import MatchingService

router = APIRouter()


@router.post("/match", response_model=MatchResponse)
async def match_text(
    body: MatchRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> MatchResponse:
    return await MatchingService().match_text(
        session,
        body=body,
        trace_id=request.state.trace_id,
        user_id=current_user.user_id,
    )


@router.post("/match/file", response_model=MatchResponse)
async def match_file(
    request: Request,
    requirement_file: UploadFile = File(...),
    candidate_file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> MatchResponse:
    return await MatchingService().match_files(
        session,
        requirement_file_name=requirement_file.filename or "",
        requirement_file_bytes=await requirement_file.read(),
        candidate_file_name=candidate_file.filename or "",
        candidate_file_bytes=await candidate_file.read(),
        trace_id=request.state.trace_id,
        user_id=current_user.user_id,
    )


@router.post("/match/bulk", response_model=BulkMatchResponse)
async def match_bulk(
    request: Request,
    requirement_text: str | None = Form(default=None),
    requirement_file: UploadFile | None = File(default=None),
    candidate_files: list[UploadFile] = File(...),
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> BulkMatchResponse:
    if not candidate_files:
        raise ValidationAppError("empty_candidate_files", "At least one candidate file is required.")
    service = MatchingService()
    resolved_requirement_text = (requirement_text or "").strip()
    if not resolved_requirement_text and requirement_file is not None:
        resolved_requirement_text = service.text_extractor.extract_requirement_text(
            requirement_file.filename or "",
            await requirement_file.read(),
        )
    if not resolved_requirement_text:
        raise ValidationAppError("empty_requirement", "Either requirement_text or requirement_file is required.")
    candidates = [(upload.filename or "", await upload.read()) for upload in candidate_files]
    return await service.match_bulk(
        session,
        requirement_text=resolved_requirement_text,
        candidates=candidates,
        trace_id=request.state.trace_id,
        user_id=current_user.user_id,
    )
@router.post("/skillsheet/parse", response_model=SkillsheetParseResponse)
async def parse_skillsheet(
    file: UploadFile = File(...),
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> SkillsheetParseResponse:
    return await MatchingService().parse_skillsheet(
        session,
        file_name=file.filename or "",
        file_bytes=await file.read(),
    )


@router.post("/knowledge/past-case", response_model=PastCaseCreateResponse)
async def create_past_case(
    body: PastCaseCreateRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_roles("admin", "pm", "pmo")),
    session: AsyncSession = Depends(get_db_session),
) -> PastCaseCreateResponse:
    return await MatchingService().create_past_case(
        session,
        body=body,
        trace_id=request.state.trace_id,
        user_id=current_user.user_id,
    )


@router.get("/matches", response_model=MatchListResponse)
async def list_matches(
    limit: int = Query(default=20, ge=1, le=100),
    review_required: bool | None = Query(default=None),
    bulk_id: int | None = Query(default=None, ge=1),
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> MatchListResponse:
    return await MatchingService().list_matches(
        session,
        limit=limit,
        review_required=review_required,
        bulk_id=bulk_id,
    )


@router.get("/matches/export")
async def export_matches(
    review_required: bool | None = Query(default=None),
    bulk_id: int | None = Query(default=None, ge=1),
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> StreamingResponse:
    csv_text = await MatchingService().export_matches_csv(
        session,
        review_required=review_required,
        bulk_id=bulk_id,
    )
    return StreamingResponse(
        iter([csv_text]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="system16_matches.csv"'},
    )


@router.get("/matches/{match_id}", response_model=MatchResponse)
async def get_match(
    match_id: int,
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> MatchResponse:
    return await MatchingService().get_match(session, match_id=match_id)
