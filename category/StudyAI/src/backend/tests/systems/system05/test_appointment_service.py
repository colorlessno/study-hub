from __future__ import annotations

import asyncio
from datetime import datetime
from types import SimpleNamespace

from studyai.common.auth.models import AuthenticatedUser
from studyai.common.errors.models import ConflictAppError
from studyai.systems.system05.schemas.medical import AppointmentCreateRequest
from studyai.systems.system05.services.appointment_service import AppointmentService


def test_appointment_service_rejects_conflicted_slot(monkeypatch) -> None:
    async def _get_patient(self, patient_id: int):
        return SimpleNamespace(id=patient_id, name="患者A", birth_date=None, phone="09012345678")

    async def _find_conflict(self, *, start_time, end_time, therapist_name):
        return SimpleNamespace(id=99)

    monkeypatch.setattr(
        "studyai.systems.system05.repositories.patient_repository.PatientRepository.get_patient",
        _get_patient,
    )
    monkeypatch.setattr(
        "studyai.systems.system05.repositories.appointment_repository.AppointmentRepository.find_conflict",
        _find_conflict,
    )

    body = AppointmentCreateRequest(
        patient_id=1,
        start_time=datetime(2026, 4, 15, 10, 0, 0),
        end_time=datetime(2026, 4, 15, 11, 0, 0),
        menu="整体60分",
        therapist_name="施術者A",
    )
    user = AuthenticatedUser(user_id="u1", roles=["reception"])

    async def _run():
        await AppointmentService().create_appointment(
            session=SimpleNamespace(),
            body=body,
            trace_id="trace-1",
            user=user,
        )

    try:
        asyncio.run(_run())
    except ConflictAppError as exc:
        assert exc.error_code == "invalid_appointment_slot"
    else:
        raise AssertionError("ConflictAppError was not raised")
