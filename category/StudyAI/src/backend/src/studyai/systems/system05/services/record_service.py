from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.auth.models import AuthenticatedUser
from studyai.common.errors.models import ValidationAppError
from studyai.systems.system05.repositories.patient_repository import PatientRepository
from studyai.systems.system05.repositories.record_repository import RecordRepository
from studyai.systems.system05.schemas.medical import (
    RecordGenerateRequest,
    RecordGenerateResponse,
    RecordHistoryResponse,
    RecordRevisionItemResponse,
    RecordUpdateRequest,
    SoapResponse,
)
from studyai.systems.system05.services.audit_log_service import AuditLogService
from studyai.systems.system05.services.soap_generator import SOAPGenerator
from studyai.systems.system05.services.suggestion_service import SuggestionService
from studyai.systems.system05.services.voice_transcriber import VoiceTranscriber


class RecordService:
    def __init__(self) -> None:
        self.soap_generator = SOAPGenerator()
        self.voice_transcriber = VoiceTranscriber()
        self.suggestion_service = SuggestionService()
        self.audit_log_service = AuditLogService()

    async def generate_record(
        self,
        session: AsyncSession,
        *,
        body: RecordGenerateRequest,
        trace_id: str,
        user: AuthenticatedUser,
    ) -> RecordGenerateResponse:
        patient = await PatientRepository(session).get_patient(body.patient_id)
        soap = await self.soap_generator.generate_soap(memo=body.memo)
        recent_records = sorted(patient.records, key=lambda row: (row.session_date, row.id), reverse=True)[:5]
        suggestion = self.suggestion_service.build_next_visit_suggestion(
            patient_name=patient.name,
            contraindications=patient.contraindications,
            recent_records=recent_records,
        )
        record = await RecordRepository(session).create_record(
            patient_id=body.patient_id,
            session_date=body.session_date,
            duration_minutes=body.duration_minutes,
            menu=body.menu,
            fee=body.fee,
            soap_subjective=soap["s"],
            soap_objective=soap["o"],
            soap_assessment=soap["a"],
            soap_plan=soap["p"],
            suggestion_memo=suggestion.reason,
            created_by=user.user_id,
            updated_by=user.user_id,
        )
        await PatientRepository(session).increment_visit_count(body.patient_id)
        await self.audit_log_service.log(
            session,
            trace_id=trace_id,
            user=user,
            action="system05.record.generate",
            target_type="record",
            target_id=record.id,
            detail={"patient_id": body.patient_id},
        )
        await session.commit()
        return RecordGenerateResponse(
            record_id=record.id,
            patient_id=body.patient_id,
            session_date=body.session_date,
            menu=body.menu,
            fee=body.fee,
            soap=SoapResponse(**soap),
            suggestion=suggestion,
        )

    async def generate_record_from_voice(
        self,
        session: AsyncSession,
        *,
        patient_id: int,
        session_date,
        duration_minutes: int,
        menu: str,
        fee: int,
        file_name: str,
        file_bytes: bytes,
        trace_id: str,
        user: AuthenticatedUser,
    ) -> RecordGenerateResponse:
        memo = await self.voice_transcriber.transcribe_audio(file_name=file_name, file_bytes=file_bytes)
        return await self.generate_record(
            session,
            body=RecordGenerateRequest(
                patient_id=patient_id,
                session_date=session_date,
                duration_minutes=duration_minutes,
                menu=menu,
                memo=memo,
                fee=fee,
            ),
            trace_id=trace_id,
            user=user,
        )

    async def update_record(
        self,
        session: AsyncSession,
        *,
        record_id: int,
        body: RecordUpdateRequest,
        trace_id: str,
        user: AuthenticatedUser,
    ) -> RecordGenerateResponse:
        if not body.correction_reason.strip():
            raise ValidationAppError("record_revision_required", "Correction reason is required.")
        repository = RecordRepository(session)
        record = await repository.get_record(record_id)
        before_record = {
            "s": record.soap_subjective,
            "o": record.soap_objective,
            "a": record.soap_assessment,
            "p": record.soap_plan,
        }
        after_record = body.soap.model_dump()
        await repository.add_revision(
            record_id=record.id,
            before_record=before_record,
            after_record=after_record,
            reason=body.correction_reason,
            updated_by=user.user_id or "unknown",
        )
        record.soap_subjective = body.soap.s
        record.soap_objective = body.soap.o
        record.soap_assessment = body.soap.a
        record.soap_plan = body.soap.p
        record.updated_by = user.user_id
        patient = await PatientRepository(session).get_patient(record.patient_id)
        recent_records = sorted(patient.records, key=lambda row: (row.session_date, row.id), reverse=True)[:5]
        suggestion = self.suggestion_service.build_next_visit_suggestion(
            patient_name=patient.name,
            contraindications=patient.contraindications,
            recent_records=recent_records,
        )
        record.suggestion_memo = suggestion.reason
        await self.audit_log_service.log(
            session,
            trace_id=trace_id,
            user=user,
            action="system05.record.update",
            target_type="record",
            target_id=record.id,
            detail={"reason": body.correction_reason},
        )
        await session.commit()
        return RecordGenerateResponse(
            record_id=record.id,
            patient_id=record.patient_id,
            session_date=record.session_date,
            menu=record.menu,
            fee=record.fee,
            soap=body.soap,
            suggestion=suggestion,
        )

    async def get_history(
        self,
        session: AsyncSession,
        *,
        record_id: int,
    ) -> RecordHistoryResponse:
        revisions = await RecordRepository(session).list_revisions(record_id)
        return RecordHistoryResponse(
            record_id=record_id,
            items=[
                RecordRevisionItemResponse(
                    revision_no=row.revision_no,
                    reason=row.reason,
                    updated_by=row.updated_by,
                    updated_at=row.updated_at,
                    before_record=SoapResponse(**row.before_record),
                    after_record=SoapResponse(**row.after_record),
                )
                for row in revisions
            ],
        )

    async def get_suggestion(
        self,
        session: AsyncSession,
        *,
        patient_id: int,
        trace_id: str,
        user: AuthenticatedUser,
    ):
        patient = await PatientRepository(session).get_patient(patient_id)
        recent_records = sorted(patient.records, key=lambda row: (row.session_date, row.id), reverse=True)[:5]
        suggestion = self.suggestion_service.build_next_visit_suggestion(
            patient_name=patient.name,
            contraindications=patient.contraindications,
            recent_records=recent_records,
        )
        await self.audit_log_service.log(
            session,
            trace_id=trace_id,
            user=user,
            action="system05.record.suggestion",
            target_type="patient",
            target_id=patient_id,
        )
        await session.commit()
        return suggestion
