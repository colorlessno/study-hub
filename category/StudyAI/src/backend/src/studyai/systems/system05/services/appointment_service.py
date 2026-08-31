from __future__ import annotations

import secrets
from datetime import date, datetime, time, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.auth.models import AuthenticatedUser
from studyai.common.errors.models import ConflictAppError, ValidationAppError
from studyai.systems.system05.repositories.appointment_repository import AppointmentRepository
from studyai.systems.system05.repositories.patient_repository import PatientRepository
from studyai.systems.system05.schemas.medical import (
    AppointmentCreateRequest,
    AppointmentListResponse,
    AppointmentResponse,
    AppointmentStatusUpdateRequest,
    AvailableSlotResponse,
    AvailableSlotsResponse,
)
from studyai.systems.system05.services.audit_log_service import AuditLogService


class AppointmentService:
    _ALLOWED_STATUSES = {"scheduled", "completed", "cancelled", "no_show"}

    def __init__(self) -> None:
        self.audit_log_service = AuditLogService()

    async def create_appointment(
        self,
        session: AsyncSession,
        *,
        body: AppointmentCreateRequest,
        trace_id: str,
        user: AuthenticatedUser,
    ) -> AppointmentResponse:
        if body.start_time >= body.end_time:
            raise ValidationAppError("invalid_appointment_slot", "start_time must be earlier than end_time.")
        patient = await PatientRepository(session).get_patient(body.patient_id)
        if body.channel == "patient":
            self._verify_patient(patient, body)
        repository = AppointmentRepository(session)
        conflict = await repository.find_conflict(
            start_time=body.start_time,
            end_time=body.end_time,
            therapist_name=body.therapist_name,
        )
        if conflict is not None:
            raise ConflictAppError("invalid_appointment_slot", "The appointment slot is already booked.")
        appointment = await repository.create_appointment(
            patient_id=body.patient_id,
            start_time=body.start_time,
            end_time=body.end_time,
            menu=body.menu,
            therapist_name=body.therapist_name,
            status="scheduled",
            channel=body.channel,
            confirmation_code=self._confirmation_code(),
            memo=body.memo,
        )
        await self.audit_log_service.log(
            session,
            trace_id=trace_id,
            user=user,
            action="system05.appointment.create",
            target_type="appointment",
            target_id=appointment.id,
            detail={"patient_id": body.patient_id},
        )
        await session.commit()
        return self._to_response(appointment, patient.name)

    async def list_appointments(
        self,
        session: AsyncSession,
        *,
        target_date: date | None,
        patient_id: int | None,
    ) -> AppointmentListResponse:
        items = await AppointmentRepository(session).list_appointments(target_date=target_date, patient_id=patient_id)
        patient_names: dict[int, str] = {}
        for item in items:
            if item.patient_id not in patient_names:
                patient_names[item.patient_id] = (await PatientRepository(session).get_patient(item.patient_id)).name
        return AppointmentListResponse(
            total=len(items),
            items=[self._to_response(item, patient_names.get(item.patient_id)) for item in items],
        )

    async def list_available_slots(
        self,
        session: AsyncSession,
        *,
        target_date: date,
        duration_minutes: int,
        therapist_name: str | None,
    ) -> AvailableSlotsResponse:
        if duration_minutes <= 0:
            raise ValidationAppError("invalid_duration", "duration_minutes must be positive.")
        existing = await AppointmentRepository(session).list_appointments(target_date=target_date)
        slots: list[AvailableSlotResponse] = []
        current = datetime.combine(target_date, time(hour=9))
        day_end = datetime.combine(target_date, time(hour=19))
        step = timedelta(minutes=30)
        duration = timedelta(minutes=duration_minutes)
        while current + duration <= day_end:
            end_time = current + duration
            conflict = False
            for item in existing:
                if therapist_name and item.therapist_name not in (None, therapist_name):
                    continue
                if item.status not in {"scheduled", "completed"}:
                    continue
                if item.start_time < end_time and item.end_time > current:
                    conflict = True
                    break
            if not conflict:
                slots.append(AvailableSlotResponse(start_time=current, end_time=end_time))
            current += step
        return AvailableSlotsResponse(total=len(slots), items=slots)

    async def update_status(
        self,
        session: AsyncSession,
        *,
        appointment_id: int,
        body: AppointmentStatusUpdateRequest,
        trace_id: str,
        user: AuthenticatedUser,
    ) -> AppointmentResponse:
        if body.status not in self._ALLOWED_STATUSES:
            raise ValidationAppError("invalid_appointment_status", "Appointment status is invalid.")
        repository = AppointmentRepository(session)
        appointment = await repository.get_appointment(appointment_id)
        appointment.status = body.status
        patient = await PatientRepository(session).get_patient(appointment.patient_id)
        await self.audit_log_service.log(
            session,
            trace_id=trace_id,
            user=user,
            action="system05.appointment.update_status",
            target_type="appointment",
            target_id=appointment.id,
            detail={"status": body.status},
        )
        await session.commit()
        return self._to_response(appointment, patient.name)

    @staticmethod
    def _confirmation_code() -> str:
        return secrets.token_hex(4).upper()

    @staticmethod
    def _verify_patient(patient, body: AppointmentCreateRequest) -> None:
        birth_match = body.verification_birth_date is not None and patient.birth_date == body.verification_birth_date
        phone_match = body.verification_phone_last4 is not None and patient.phone.endswith(body.verification_phone_last4)
        if not (birth_match or phone_match):
            raise ValidationAppError("patient_verification_failed", "Patient verification failed.")

    @staticmethod
    def _to_response(row, patient_name: str | None) -> AppointmentResponse:
        return AppointmentResponse(
            appointment_id=row.id,
            patient_id=row.patient_id,
            patient_name=patient_name,
            start_time=row.start_time,
            end_time=row.end_time,
            menu=row.menu,
            therapist_name=row.therapist_name,
            status=row.status,
            channel=row.channel,
            confirmation_code=row.confirmation_code,
            memo=row.memo,
        )
