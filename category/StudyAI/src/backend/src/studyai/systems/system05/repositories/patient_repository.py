from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from studyai.common.errors.models import NotFoundAppError
from studyai.systems.system05.models.medical import System05Patient


class PatientRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_patient(self, **kwargs) -> System05Patient:
        patient = System05Patient(**kwargs)
        self.session.add(patient)
        await self.session.flush()
        await self.session.refresh(patient)
        return patient

    async def list_patients(
        self,
        *,
        name: str | None = None,
        phone: str | None = None,
        visit_count_min: int | None = None,
    ) -> tuple[int, list[System05Patient]]:
        stmt = select(System05Patient)
        count_stmt = select(func.count()).select_from(System05Patient)
        if name:
            condition = or_(
                System05Patient.name.ilike(f"%{name}%"),
                System05Patient.name_kana.ilike(f"%{name}%"),
            )
            stmt = stmt.where(condition)
            count_stmt = count_stmt.where(condition)
        if phone:
            condition = System05Patient.phone.ilike(f"%{phone}%")
            stmt = stmt.where(condition)
            count_stmt = count_stmt.where(condition)
        if visit_count_min is not None:
            condition = System05Patient.visit_count >= visit_count_min
            stmt = stmt.where(condition)
            count_stmt = count_stmt.where(condition)
        stmt = stmt.order_by(System05Patient.updated_at.desc(), System05Patient.id.desc())
        total = int((await self.session.execute(count_stmt)).scalar_one())
        items = list((await self.session.execute(stmt)).scalars().all())
        return total, items

    async def get_patient(self, patient_id: int) -> System05Patient:
        result = await self.session.execute(
            select(System05Patient)
            .options(
                selectinload(System05Patient.records),
                selectinload(System05Patient.appointments),
            )
            .where(System05Patient.id == patient_id)
        )
        patient = result.scalar_one_or_none()
        if patient is None:
            raise NotFoundAppError("patient_not_found", "The patient was not found.")
        return patient

    async def increment_visit_count(self, patient_id: int) -> None:
        patient = await self.get_patient(patient_id)
        patient.visit_count += 1
        await self.session.flush()
