from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field


class PatientCreateRequest(BaseModel):
    name: str = Field(min_length=1)
    name_kana: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    phone: str = Field(min_length=4)
    email: str | None = None
    address: str | None = None
    occupation: str | None = None
    contraindications: str | None = None
    therapist_name: str | None = None


class PatientSummaryResponse(BaseModel):
    patient_id: int
    name: str
    phone: str
    visit_count: int
    last_visit_date: date | None = None


class PatientListResponse(BaseModel):
    total: int
    items: list[PatientSummaryResponse] = Field(default_factory=list)


class SoapResponse(BaseModel):
    s: str
    o: str
    a: str
    p: str


class SuggestionResponse(BaseModel):
    recommended_menu: str
    reason: str
    cautions: list[str] = Field(default_factory=list)
    target_interval_days: int
    home_care: str | None = None


class RecordSummaryResponse(BaseModel):
    record_id: int
    session_date: date
    menu: str
    fee: int
    soap: SoapResponse
    created_at: datetime


class AppointmentResponse(BaseModel):
    appointment_id: int
    patient_id: int
    patient_name: str | None = None
    start_time: datetime
    end_time: datetime
    menu: str
    therapist_name: str | None = None
    status: str
    channel: str
    confirmation_code: str | None = None
    memo: str | None = None


class PatientDetailResponse(BaseModel):
    patient_id: int
    name: str
    name_kana: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    phone: str
    email: str | None = None
    address: str | None = None
    occupation: str | None = None
    contraindications: str | None = None
    therapist_name: str | None = None
    first_visit_date: date | None = None
    visit_count: int
    recent_records: list[RecordSummaryResponse] = Field(default_factory=list)
    appointments: list[AppointmentResponse] = Field(default_factory=list)


class RecordGenerateRequest(BaseModel):
    patient_id: int
    session_date: date
    duration_minutes: int = Field(gt=0)
    menu: str = Field(min_length=1)
    memo: str = Field(min_length=1)
    fee: int = Field(ge=0)


class RecordGenerateResponse(BaseModel):
    record_id: int
    patient_id: int
    session_date: date
    menu: str
    fee: int
    soap: SoapResponse
    suggestion: SuggestionResponse | None = None


class RecordUpdateRequest(BaseModel):
    soap: SoapResponse
    correction_reason: str = Field(min_length=1)


class RecordRevisionItemResponse(BaseModel):
    revision_no: int
    reason: str
    updated_by: str
    updated_at: datetime
    before_record: SoapResponse
    after_record: SoapResponse


class RecordHistoryResponse(BaseModel):
    record_id: int
    items: list[RecordRevisionItemResponse] = Field(default_factory=list)


class AppointmentCreateRequest(BaseModel):
    patient_id: int
    start_time: datetime
    end_time: datetime
    menu: str = Field(min_length=1)
    therapist_name: str | None = None
    memo: str | None = None
    channel: str = "staff"
    verification_birth_date: date | None = None
    verification_phone_last4: str | None = None


class AppointmentListResponse(BaseModel):
    total: int
    items: list[AppointmentResponse] = Field(default_factory=list)


class AvailableSlotResponse(BaseModel):
    start_time: datetime
    end_time: datetime


class AvailableSlotsResponse(BaseModel):
    total: int
    items: list[AvailableSlotResponse] = Field(default_factory=list)


class AppointmentStatusUpdateRequest(BaseModel):
    status: str = Field(min_length=1)


class BackupRunResponse(BaseModel):
    backup_id: int
    status: str
    archive_path: str | None = None
    started_at: datetime
    finished_at: datetime | None = None


class BackupHistoryItemResponse(BaseModel):
    backup_id: int
    status: str
    archive_path: str | None = None
    started_at: datetime
    finished_at: datetime | None = None
    error_message: str | None = None


class BackupHistoryResponse(BaseModel):
    total: int
    items: list[BackupHistoryItemResponse] = Field(default_factory=list)


class MonthlyStatsResponse(BaseModel):
    month: str
    total_appointments: int
    completed_appointments: int
    cancelled_appointments: int
    total_sales: int
    new_patients: int
    repeat_rate: float
    menu_ranking: list[dict] = Field(default_factory=list)
