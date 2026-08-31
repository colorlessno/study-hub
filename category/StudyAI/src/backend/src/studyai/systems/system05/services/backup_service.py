from __future__ import annotations

import os
import shutil
import subprocess
from datetime import datetime
from urllib.parse import unquote, urlparse

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.auth.models import AuthenticatedUser
from studyai.common.config.settings import get_settings
from studyai.common.errors.models import ExternalServiceError
from studyai.systems.system05.repositories.backup_repository import BackupRepository
from studyai.systems.system05.schemas.medical import BackupHistoryItemResponse, BackupHistoryResponse, BackupRunResponse
from studyai.systems.system05.services.audit_log_service import AuditLogService


class BackupService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.audit_log_service = AuditLogService()

    async def run_backup(
        self,
        session: AsyncSession,
        *,
        trace_id: str,
        user: AuthenticatedUser,
    ) -> BackupRunResponse:
        repository = BackupRepository(session)
        row = await repository.create_running_log()
        try:
            archive_path = self._create_backup_archive()
            finished_at = datetime.utcnow()
            await repository.mark_success(row, archive_path=archive_path, finished_at=finished_at)
            await self.audit_log_service.log(
                session,
                trace_id=trace_id,
                user=user,
                action="system05.backup.run",
                target_type="backup",
                target_id=row.id,
                detail={"archive_path": archive_path},
            )
            await session.commit()
            return BackupRunResponse(
                backup_id=row.id,
                status=row.status,
                archive_path=row.archive_path,
                started_at=row.started_at,
                finished_at=row.finished_at,
            )
        except Exception as exc:
            await repository.mark_failed(row, error_message=str(exc), finished_at=datetime.utcnow())
            await session.commit()
            raise ExternalServiceError("backup_failed", "Backup execution failed.", 500) from exc

    async def list_history(self, session: AsyncSession) -> BackupHistoryResponse:
        rows = await BackupRepository(session).list_history()
        return BackupHistoryResponse(
            total=len(rows),
            items=[
                BackupHistoryItemResponse(
                    backup_id=row.id,
                    status=row.status,
                    archive_path=row.archive_path,
                    started_at=row.started_at,
                    finished_at=row.finished_at,
                    error_message=row.error_message,
                )
                for row in rows
            ],
        )

    def _create_backup_archive(self) -> str:
        backup_dir = self.settings.upload_dir / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        pg_dump = shutil.which("pg_dump")
        if pg_dump is None:
            raise RuntimeError("pg_dump is not available.")
        parsed = urlparse(self.settings.database_url.replace("+asyncpg", ""))
        database_name = parsed.path.lstrip("/")
        if not parsed.hostname or not database_name:
            raise RuntimeError("DATABASE_URL does not contain a PostgreSQL host and database name.")
        target = backup_dir / f"backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.dump"
        environment = os.environ.copy()
        if parsed.password:
            environment["PGPASSWORD"] = unquote(parsed.password)
        result = subprocess.run(
            [
                pg_dump,
                "--host",
                parsed.hostname,
                "--port",
                str(parsed.port or 5432),
                "--username",
                unquote(parsed.username or "postgres"),
                "--dbname",
                database_name,
                "--format",
                "custom",
            ],
            check=False,
            capture_output=True,
            env=environment,
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr.decode("utf-8", errors="ignore") or "pg_dump failed.")
        target.write_bytes(result.stdout)
        return str(target)
