from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.auth.dependencies import require_authenticated, require_roles
from studyai.common.auth.models import AuthenticatedUser
from studyai.common.db.session import get_db_session
from studyai.systems.system05.schemas.medical import (
    AppointmentCreateRequest,
    AppointmentListResponse,
    AppointmentResponse,
    AppointmentStatusUpdateRequest,
    AvailableSlotsResponse,
    BackupHistoryResponse,
    BackupRunResponse,
    MonthlyStatsResponse,
    PatientCreateRequest,
    PatientDetailResponse,
    PatientListResponse,
    RecordGenerateRequest,
    RecordGenerateResponse,
    RecordHistoryResponse,
    RecordUpdateRequest,
    SuggestionResponse,
)
from studyai.systems.system05.services.appointment_service import AppointmentService
from studyai.systems.system05.services.backup_service import BackupService
from studyai.systems.system05.services.patient_service import PatientService
from studyai.systems.system05.services.record_service import RecordService
from studyai.systems.system05.services.stats_service import StatsService

router = APIRouter()


@router.post("/patients", response_model=PatientDetailResponse)
async def create_patient(
    body: PatientCreateRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_roles("therapist", "reception", "admin")),
    session: AsyncSession = Depends(get_db_session),
) -> PatientDetailResponse:
    return await PatientService().create_patient(session, body=body, trace_id=request.state.trace_id, user=current_user)


@router.get("/patients", response_model=PatientListResponse)
async def list_patients(
    name: str | None = None,
    phone: str | None = None,
    visit_count_min: int | None = Query(default=None),
    _: AuthenticatedUser = Depends(require_roles("therapist", "reception", "admin")),
    session: AsyncSession = Depends(get_db_session),
) -> PatientListResponse:
    return await PatientService().list_patients(session, name=name, phone=phone, visit_count_min=visit_count_min)


@router.get("/patients/{patient_id}", response_model=PatientDetailResponse)
async def get_patient(
    patient_id: int,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_roles("therapist", "reception", "admin")),
    session: AsyncSession = Depends(get_db_session),
) -> PatientDetailResponse:
    return await PatientService().get_patient(session, patient_id=patient_id, trace_id=request.state.trace_id, user=current_user)


@router.post("/records/generate", response_model=RecordGenerateResponse)
async def generate_record(
    body: RecordGenerateRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_roles("therapist", "admin")),
    session: AsyncSession = Depends(get_db_session),
) -> RecordGenerateResponse:
    return await RecordService().generate_record(session, body=body, trace_id=request.state.trace_id, user=current_user)


@router.post("/records/generate/voice", response_model=RecordGenerateResponse)
async def generate_record_from_voice(
    request: Request,
    patient_id: int = Form(...),
    session_date: date = Form(...),
    duration_minutes: int = Form(...),
    menu: str = Form(...),
    fee: int = Form(...),
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(require_roles("therapist", "admin")),
    session: AsyncSession = Depends(get_db_session),
) -> RecordGenerateResponse:
    file_bytes = await file.read()
    return await RecordService().generate_record_from_voice(
        session,
        patient_id=patient_id,
        session_date=session_date,
        duration_minutes=duration_minutes,
        menu=menu,
        fee=fee,
        file_name=file.filename or "voice.wav",
        file_bytes=file_bytes,
        trace_id=request.state.trace_id,
        user=current_user,
    )


@router.patch("/records/{record_id}", response_model=RecordGenerateResponse)
async def update_record(
    record_id: int,
    body: RecordUpdateRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_roles("therapist", "admin")),
    session: AsyncSession = Depends(get_db_session),
) -> RecordGenerateResponse:
    return await RecordService().update_record(
        session,
        record_id=record_id,
        body=body,
        trace_id=request.state.trace_id,
        user=current_user,
    )


@router.get("/records/{record_id}/history", response_model=RecordHistoryResponse)
async def get_record_history(
    record_id: int,
    _: AuthenticatedUser = Depends(require_roles("therapist", "admin")),
    session: AsyncSession = Depends(get_db_session),
) -> RecordHistoryResponse:
    return await RecordService().get_history(session, record_id=record_id)


@router.get("/patients/{patient_id}/suggestion", response_model=SuggestionResponse)
async def get_suggestion(
    patient_id: int,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_roles("therapist", "admin")),
    session: AsyncSession = Depends(get_db_session),
) -> SuggestionResponse:
    return await RecordService().get_suggestion(
        session,
        patient_id=patient_id,
        trace_id=request.state.trace_id,
        user=current_user,
    )


@router.post("/appointments", response_model=AppointmentResponse)
async def create_appointment(
    body: AppointmentCreateRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> AppointmentResponse:
    return await AppointmentService().create_appointment(
        session,
        body=body,
        trace_id=request.state.trace_id,
        user=current_user,
    )


@router.get("/appointments", response_model=AppointmentListResponse)
async def list_appointments(
    target_date: date | None = None,
    patient_id: int | None = None,
    _: AuthenticatedUser = Depends(require_roles("therapist", "reception", "admin")),
    session: AsyncSession = Depends(get_db_session),
) -> AppointmentListResponse:
    return await AppointmentService().list_appointments(session, target_date=target_date, patient_id=patient_id)


@router.get("/appointments/available-slots", response_model=AvailableSlotsResponse)
async def available_slots(
    target_date: date,
    duration_minutes: int = Query(...),
    therapist_name: str | None = None,
    _: AuthenticatedUser = Depends(require_authenticated),
    session: AsyncSession = Depends(get_db_session),
) -> AvailableSlotsResponse:
    return await AppointmentService().list_available_slots(
        session,
        target_date=target_date,
        duration_minutes=duration_minutes,
        therapist_name=therapist_name,
    )


@router.patch("/appointments/{appointment_id}/status", response_model=AppointmentResponse)
async def update_appointment_status(
    appointment_id: int,
    body: AppointmentStatusUpdateRequest,
    request: Request,
    current_user: AuthenticatedUser = Depends(require_roles("therapist", "reception", "admin")),
    session: AsyncSession = Depends(get_db_session),
) -> AppointmentResponse:
    return await AppointmentService().update_status(
        session,
        appointment_id=appointment_id,
        body=body,
        trace_id=request.state.trace_id,
        user=current_user,
    )


@router.get("/stats/monthly", response_model=MonthlyStatsResponse)
async def get_monthly_stats(
    month: str,
    _: AuthenticatedUser = Depends(require_roles("therapist", "admin")),
    session: AsyncSession = Depends(get_db_session),
) -> MonthlyStatsResponse:
    return await StatsService().get_monthly_stats(session, month=month)


@router.post("/backup/run", response_model=BackupRunResponse)
async def run_backup(
    request: Request,
    current_user: AuthenticatedUser = Depends(require_roles("admin")),
    session: AsyncSession = Depends(get_db_session),
) -> BackupRunResponse:
    return await BackupService().run_backup(session, trace_id=request.state.trace_id, user=current_user)


@router.get("/backup/history", response_model=BackupHistoryResponse)
async def get_backup_history(
    _: AuthenticatedUser = Depends(require_roles("admin")),
    session: AsyncSession = Depends(get_db_session),
) -> BackupHistoryResponse:
    return await BackupService().list_history(session)
