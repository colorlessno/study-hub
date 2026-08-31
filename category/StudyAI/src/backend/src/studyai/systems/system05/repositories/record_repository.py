from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from studyai.common.errors.models import NotFoundAppError
from studyai.systems.system05.models.medical import System05RecordRevision, System05TreatmentRecord


class RecordRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_record(self, **kwargs) -> System05TreatmentRecord:
        record = System05TreatmentRecord(**kwargs)
        self.session.add(record)
        await self.session.flush()
        await self.session.refresh(record)
        return record

    async def get_record(self, record_id: int) -> System05TreatmentRecord:
        result = await self.session.execute(
            select(System05TreatmentRecord)
            .options(selectinload(System05TreatmentRecord.revisions))
            .where(System05TreatmentRecord.id == record_id)
        )
        record = result.scalar_one_or_none()
        if record is None:
            raise NotFoundAppError("record_not_found", "The treatment record was not found.")
        return record

    async def list_recent_records_for_patient(
        self,
        *,
        patient_id: int,
        limit: int = 5,
    ) -> list[System05TreatmentRecord]:
        result = await self.session.execute(
            select(System05TreatmentRecord)
            .where(System05TreatmentRecord.patient_id == patient_id)
            .order_by(System05TreatmentRecord.session_date.desc(), System05TreatmentRecord.id.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def next_revision_no(self, record_id: int) -> int:
        result = await self.session.execute(
            select(func.coalesce(func.max(System05RecordRevision.revision_no), 0))
            .where(System05RecordRevision.record_id == record_id)
        )
        max_no = int(result.scalar_one())
        return max_no + 1

    async def add_revision(
        self,
        *,
        record_id: int,
        before_record: dict,
        after_record: dict,
        reason: str,
        updated_by: str,
    ) -> System05RecordRevision:
        revision = System05RecordRevision(
            record_id=record_id,
            revision_no=await self.next_revision_no(record_id),
            before_record=before_record,
            after_record=after_record,
            reason=reason,
            updated_by=updated_by,
        )
        self.session.add(revision)
        await self.session.flush()
        await self.session.refresh(revision)
        return revision

    async def list_revisions(self, record_id: int) -> list[System05RecordRevision]:
        result = await self.session.execute(
            select(System05RecordRevision)
            .where(System05RecordRevision.record_id == record_id)
            .order_by(System05RecordRevision.revision_no.asc())
        )
        return list(result.scalars().all())
