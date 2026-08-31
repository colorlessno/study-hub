from __future__ import annotations

import json
import logging
from datetime import datetime, timezone


class AuditLogger:
    def __init__(self) -> None:
        self._logger = logging.getLogger("studyai.audit")

    def log(
        self,
        *,
        action: str,
        trace_id: str,
        user_id: str | None = None,
        resource_type: str | None = None,
        resource_id: str | int | None = None,
        details: dict | None = None,
        actor: str | None = None,
        target_type: str | None = None,
        target_id: str | int | None = None,
        metadata: dict | None = None,
    ) -> None:
        resolved_user_id = user_id if user_id is not None else actor
        resolved_resource_type = resource_type if resource_type is not None else target_type
        resolved_resource_id = resource_id if resource_id is not None else target_id
        resolved_details = details if details is not None else metadata
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "trace_id": trace_id,
            "user_id": resolved_user_id,
            "resource_type": resolved_resource_type or "unknown",
            "resource_id": resolved_resource_id,
            "details": resolved_details or {},
        }
        self._logger.info(json.dumps(payload, ensure_ascii=False))


_audit_logger = AuditLogger()


def get_audit_logger() -> AuditLogger:
    return _audit_logger
