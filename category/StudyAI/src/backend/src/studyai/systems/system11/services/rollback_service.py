from __future__ import annotations

import logging
import os
from pathlib import Path

from studyai.common.mcp.filesystem_client import FilesystemMCPSession, MCPProtocolError
from studyai.systems.system11.services.path_safety_service import PathSafetyService, _SYSTEM_PATH_PREFIXES

logger = logging.getLogger(__name__)


class RollbackService:
    def __init__(self, safety: PathSafetyService | None = None) -> None:
        self.safety = safety or PathSafetyService()

    def rollback_items(
        self,
        rollback_data: list[dict],
        allowed_roots: list[Path],
    ) -> list[dict]:
        """rollback_data の逆操作を行う。allowed_roots でスコープ検証する。"""
        results: list[dict] = []
        mcp_root = Path(os.path.commonpath([str(root) for root in allowed_roots])).resolve()
        with FilesystemMCPSession(mcp_root) as session:
            for item in reversed(rollback_data):
                result = self._rollback_one(session, item, allowed_roots)
                results.append(result)
        return results

    def _rollback_one(
        self,
        session: FilesystemMCPSession,
        item: dict,
        allowed_roots: list[Path],
    ) -> dict:
        action_id = str(item.get("action_id") or "")
        source_raw = str(item.get("source_path") or "")
        target_raw = str(item.get("target_path") or "")

        base = {
            "action_id": action_id,
            "status": "failed",
            "error_code": None,
        }

        if not source_raw or not target_raw:
            base["error_code"] = "missing_rollback_paths"
            return base

        try:
            original = Path(source_raw).resolve()
            current = Path(target_raw).resolve()
        except Exception:
            base["error_code"] = "invalid_rollback_path"
            return base

        # 安全性検証①: システムパス拒否
        for path in (original, current):
            normalized = str(path).lower()
            for prefix in _SYSTEM_PATH_PREFIXES:
                if normalized == prefix or normalized.startswith(prefix + "\\") or normalized.startswith(prefix + "/"):
                    base["error_code"] = "unsafe_path_detected"
                    return base

        # 安全性検証②: スコープ検証（元 plan の watch_folders + output_folder 配下のみ許可）
        if allowed_roots:
            for path in (original, current):
                try:
                    self.safety.validate_scope(path, allowed_roots)
                except Exception:
                    base["error_code"] = "unsafe_path_detected"
                    return base

        if not current.exists():
            base["error_code"] = "target_not_found"
            return base

        if original.exists():
            base["error_code"] = "name_conflict"
            return base

        try:
            session.call_tool(
                "move_file",
                {"source_path": str(current), "destination_path": str(original)},
            )
            base["status"] = "reverted"
        except PermissionError:
            base["error_code"] = "file_locked"
        except (OSError, MCPProtocolError):
            base["error_code"] = "rollback_failed"
            logger.exception("rollback failed: %s -> %s", current, original)

        return base
