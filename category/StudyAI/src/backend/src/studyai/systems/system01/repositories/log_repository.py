from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system01.models.document import ProcessingLog


class LogRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def insert(self, file_name: str, status: str, error_msg: str | None = None) -> ProcessingLog:
        log = ProcessingLog(file_name=file_name, status=status, error_msg=error_msg)
        self.session.add(log)
        await self.session.flush()
        return log
