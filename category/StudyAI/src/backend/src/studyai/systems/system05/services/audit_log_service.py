from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.audit.logger import get_audit_logger
from studyai.common.auth.models import AuthenticatedUser
from studyai.systems.system05.repositories.audit_repository import AuditRepository


class AuditLogService:
    def __init__(self) -> None:
        self.audit_logger = get_audit_logger()

    async def log(
        self,
        session: AsyncSession,
        *,
        trace_id: str,
        user: AuthenticatedUser,
        action: str,
        target_type: str,
        target_id: str | int | None,
        result: str = "success",
        detail: dict | None = None,
    ) -> None:
        role = user.roles[0] if user.roles else "unknown"
        await AuditRepository(session).create_log(
            actor_role=role,
            actor_id=user.user_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            result=result,
            detail=detail,
        )
        self.audit_logger.log(
            action=action,
            trace_id=trace_id,
            user_id=user.user_id,
            resource_type=target_type,
            resource_id=target_id,
            details=detail or {},
        )
