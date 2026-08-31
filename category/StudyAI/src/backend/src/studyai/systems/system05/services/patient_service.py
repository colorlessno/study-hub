from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.auth.models import AuthenticatedUser
from studyai.systems.system05.repositories.patient_repository import PatientRepository
from studyai.systems.system05.schemas.medical import (
    AppointmentResponse,
    PatientCreateRequest,
    PatientDetailResponse,
    PatientListResponse,
    PatientSummaryResponse,
    RecordSummaryResponse,
    SoapResponse,
)
from studyai.systems.system05.services.audit_log_service import AuditLogService


class PatientService:
    def __init__(self) -> None:
        self.audit_log_service = AuditLogService()

    async def create_patient(
        self,
        session: AsyncSession,
        *,
        body: PatientCreateRequest,
        trace_id: str,
        user: AuthenticatedUser,
    ) -> PatientDetailResponse:
        repository = PatientRepository(session)
        patient = await repository.create_patient(**body.model_dump())
        await self.audit_log_service.log(
            session,
            trace_id=trace_id,
            user=user,
            action="system05.patient.create",
            target_type="patient",
            target_id=patient.id,
        )
        await session.commit()
        return await self.get_patient(session, patient_id=patient.id, trace_id=trace_id, user=user)

    async def list_patients(
        self,
        session: AsyncSession,
        *,
        name: str | None,
        phone: str | None,
        visit_count_min: int | None,
    ) -> PatientListResponse:
        total, items = await PatientRepository(session).list_patients(
            name=name,
            phone=phone,
            visit_count_min=visit_count_min,
        )
        return PatientListResponse(
            total=total,
            items=[
                PatientSummaryResponse(
                    patient_id=item.id,
                    name=item.name,
                    phone=item.phone,
                    visit_count=item.visit_count,
                    last_visit_date=(max((record.session_date for record in item.records), default=None)),
                )
                for item in items
            ],
        )

    async def get_patient(
        self,
        session: AsyncSession,
        *,
        patient_id: int,
        trace_id: str,
        user: AuthenticatedUser,
    ) -> PatientDetailResponse:
        patient = await PatientRepository(session).get_patient(patient_id)
        await self.audit_log_service.log(
            session,
            trace_id=trace_id,
            user=user,
            action="system05.patient.view",
            target_type="patient",
            target_id=patient.id,
        )
        await session.commit()
        recent_records = sorted(patient.records, key=lambda row: (row.session_date, row.id), reverse=True)[:5]
        appointments = sorted(patient.appointments, key=lambda row: (row.start_time, row.id), reverse=True)[:10]
        return PatientDetailResponse(
            patient_id=patient.id,
            name=patient.name,
            name_kana=patient.name_kana,
            birth_date=patient.birth_date,
            gender=patient.gender,
            phone=patient.phone,
            email=patient.email,
            address=patient.address,
            occupation=patient.occupation,
            contraindications=patient.contraindications,
            therapist_name=patient.therapist_name,
            first_visit_date=patient.created_at.date() if patient.created_at else None,
            visit_count=patient.visit_count,
            recent_records=[
                RecordSummaryResponse(
                    record_id=row.id,
                    session_date=row.session_date,
                    menu=row.menu,
                    fee=row.fee,
                    soap=SoapResponse(
                        s=row.soap_subjective,
                        o=row.soap_objective,
                        a=row.soap_assessment,
                        p=row.soap_plan,
                    ),
                    created_at=row.created_at,
                )
                for row in recent_records
            ],
            appointments=[
                AppointmentResponse(
                    appointment_id=row.id,
                    patient_id=row.patient_id,
                    patient_name=patient.name,
                    start_time=row.start_time,
                    end_time=row.end_time,
                    menu=row.menu,
                    therapist_name=row.therapist_name,
                    status=row.status,
                    channel=row.channel,
                    confirmation_code=row.confirmation_code,
                    memo=row.memo,
                )
                for row in appointments
            ],
        )
