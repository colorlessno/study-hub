from __future__ import annotations

from datetime import date, datetime, time, timedelta

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.errors.models import NotFoundAppError
from studyai.systems.system05.models.medical import System05Appointment


class AppointmentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_appointment(self, **kwargs) -> System05Appointment:
        row = System05Appointment(**kwargs)
        self.session.add(row)
        await self.session.flush()
        await self.session.refresh(row)
        return row

    async def list_appointments(
        self,
        *,
        target_date: date | None = None,
        patient_id: int | None = None,
    ) -> list[System05Appointment]:
        stmt = select(System05Appointment)
        if target_date:
            stmt = stmt.where(
                and_(
                    System05Appointment.start_time >= datetime.combine(target_date, time.min),
                    System05Appointment.start_time < datetime.combine(target_date + timedelta(days=1), time.min),
                )
            )
        if patient_id is not None:
            stmt = stmt.where(System05Appointment.patient_id == patient_id)
        stmt = stmt.order_by(System05Appointment.start_time.asc(), System05Appointment.id.asc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_appointment(self, appointment_id: int) -> System05Appointment:
        result = await self.session.execute(
            select(System05Appointment).where(System05Appointment.id == appointment_id)
        )
        row = result.scalar_one_or_none()
        if row is None:
            raise NotFoundAppError("appointment_not_found", "The appointment was not found.")
        return row

    async def find_conflict(
        self,
        *,
        start_time: datetime,
        end_time: datetime,
        therapist_name: str | None,
    ) -> System05Appointment | None:
        stmt = (
            select(System05Appointment)
            .where(System05Appointment.status.in_(["scheduled", "completed"]))
            .where(System05Appointment.start_time < end_time)
            .where(System05Appointment.end_time > start_time)
        )
        if therapist_name:
            stmt = stmt.where(System05Appointment.therapist_name == therapist_name)
        result = await self.session.execute(stmt.limit(1))
        return result.scalar_one_or_none()
