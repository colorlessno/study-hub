from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system05.models.medical import System05BackupLog


class BackupRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_running_log(self) -> System05BackupLog:
        row = System05BackupLog(status="running", started_at=datetime.utcnow())
        self.session.add(row)
        await self.session.flush()
        await self.session.refresh(row)
        return row

    async def mark_success(self, row: System05BackupLog, *, archive_path: str, finished_at: datetime) -> System05BackupLog:
        row.status = "success"
        row.archive_path = archive_path
        row.finished_at = finished_at
        await self.session.flush()
        return row

    async def mark_failed(self, row: System05BackupLog, *, error_message: str, finished_at: datetime) -> System05BackupLog:
        row.status = "failed"
        row.error_message = error_message
        row.finished_at = finished_at
        await self.session.flush()
        return row

    async def list_history(self) -> list[System05BackupLog]:
        result = await self.session.execute(
            select(System05BackupLog).order_by(System05BackupLog.started_at.desc(), System05BackupLog.id.desc())
        )
        return list(result.scalars().all())
