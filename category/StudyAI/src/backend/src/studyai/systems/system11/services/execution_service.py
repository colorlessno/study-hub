from __future__ import annotations

import logging
import os
from datetime import datetime
from pathlib import Path

from studyai.common.errors.models import AppError
from studyai.common.mcp.filesystem_client import FilesystemMCPSession, MCPProtocolError
from studyai.systems.system11.services.path_safety_service import PathSafetyService

logger = logging.getLogger(__name__)

_ITEM_STATUS_SUCCESS = "success"
_ITEM_STATUS_FAILED = "failed"
_ITEM_STATUS_CONFLICT = "conflict"
_ITEM_STATUS_LOCKED = "locked"
_ITEM_STATUS_SKIPPED = "skipped_by_policy"


class ExecutionService:
    def __init__(self, safety: PathSafetyService | None = None) -> None:
        self.safety = safety or PathSafetyService()

    def execute_actions(
        self,
        actions: list[dict],
        allowed_roots: list[Path],
    ) -> list[dict]:
        results: list[dict] = []
        mcp_root = Path(os.path.commonpath([str(root) for root in allowed_roots])).resolve()
        with FilesystemMCPSession(mcp_root) as session:
            for action in actions:
                result = self._execute_one(session, action, allowed_roots)
                results.append(result)
        return results

    def _execute_one(
        self,
        session: FilesystemMCPSession,
        action: dict,
        allowed_roots: list[Path],
    ) -> dict:
        action_id = str(action.get("action_id") or "")
        action_type = str(action.get("action_type") or "keep").lower()
        source_raw = str(action.get("source_path") or "")

        base = {
            "action_id": action_id,
            "action_type": action_type,
            "source_path": source_raw,
            "target_path": None,
            "status": _ITEM_STATUS_FAILED,
            "error_code": None,
            "rollbackable": False,
        }

        if action_type == "keep":
            base["status"] = _ITEM_STATUS_SKIPPED
            return base

        try:
            source = self.safety.normalize(source_raw)
        except Exception:
            base["error_code"] = "invalid_source_path"
            return base

        # シンボリックリンク除外
        if self.safety.is_symlink_or_junction(source):
            base["status"] = _ITEM_STATUS_SKIPPED
            base["error_code"] = "symlink_not_supported"
            return base

        # 実行ファイル除外
        if self.safety.is_forbidden_extension(source):
            base["status"] = _ITEM_STATUS_SKIPPED
            base["error_code"] = "forbidden_extension"
            return base

        # スコープ検証
        try:
            self.safety.validate_scope(source, allowed_roots)
        except AppError as exc:
            base["error_code"] = exc.error_code
            return base

        if action_type in {"move", "archive"}:
            return self._do_move(session, base, source, action, allowed_roots)
        elif action_type == "rename":
            return self._do_rename(session, base, source, action, allowed_roots)

        base["status"] = _ITEM_STATUS_SKIPPED
        return base

    def _do_move(
        self,
        session: FilesystemMCPSession,
        base: dict,
        source: Path,
        action: dict,
        allowed_roots: list[Path],
    ) -> dict:
        dest_raw = str(action.get("dest_path") or "")
        if not dest_raw:
            base["error_code"] = "missing_dest_path"
            return base
        try:
            dest = self.safety.normalize(dest_raw)
            self.safety.validate_scope(dest, allowed_roots)
        except AppError as exc:
            base["error_code"] = exc.error_code
            return base

        if self.safety.is_conflict(dest):
            base["status"] = _ITEM_STATUS_CONFLICT
            base["error_code"] = "name_conflict"
            base["target_path"] = str(dest)
            return base

        try:
            session.call_tool(
                "move_file",
                {"source_path": str(source), "destination_path": str(dest)},
            )
        except PermissionError:
            base["status"] = _ITEM_STATUS_LOCKED
            base["error_code"] = "file_locked"
            base["target_path"] = str(dest)
            return base
        except (OSError, MCPProtocolError):
            base["error_code"] = "execution_failed"
            logger.exception("move failed: %s -> %s", source, dest)
            return base

        base["status"] = _ITEM_STATUS_SUCCESS
        base["target_path"] = str(dest)
        base["rollbackable"] = True
        base["executed_at"] = datetime.utcnow()
        return base

    def _do_rename(
        self,
        session: FilesystemMCPSession,
        base: dict,
        source: Path,
        action: dict,
        allowed_roots: list[Path],
    ) -> dict:
        new_name = str(action.get("new_name") or "").strip()
        if not new_name:
            base["error_code"] = "missing_new_name"
            return base

        dest = source.parent / new_name
        try:
            self.safety.validate_scope(dest, allowed_roots)
        except AppError as exc:
            base["error_code"] = exc.error_code
            return base

        if self.safety.is_conflict(dest):
            base["status"] = _ITEM_STATUS_CONFLICT
            base["error_code"] = "name_conflict"
            base["target_path"] = str(dest)
            return base

        try:
            session.call_tool(
                "move_file",
                {"source_path": str(source), "destination_path": str(dest)},
            )
        except PermissionError:
            base["status"] = _ITEM_STATUS_LOCKED
            base["error_code"] = "file_locked"
            base["target_path"] = str(dest)
            return base
        except (OSError, MCPProtocolError):
            base["error_code"] = "execution_failed"
            logger.exception("rename failed: %s -> %s", source, dest)
            return base

        base["status"] = _ITEM_STATUS_SUCCESS
        base["target_path"] = str(dest)
        base["rollbackable"] = True
        base["executed_at"] = datetime.utcnow()
        return base
