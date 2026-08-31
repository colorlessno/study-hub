from __future__ import annotations

import base64
import logging
from datetime import datetime, timezone
from pathlib import Path

from studyai.common.mcp.filesystem_client import FilesystemMCPSession, MCPProtocolError
from studyai.systems.system11.services.path_safety_service import PathSafetyService

logger = logging.getLogger(__name__)

# テキスト系拡張子（内容プレビューを試みる）
_TEXT_EXTENSIONS = {
    ".txt", ".md", ".py", ".js", ".ts", ".java", ".sql",
    ".sh", ".yaml", ".yml", ".json", ".xml", ".csv", ".html", ".css",
}


class ScanService:
    def __init__(self, safety: PathSafetyService | None = None) -> None:
        self.safety = safety or PathSafetyService()

    def collect_files(
        self,
        watch_folders: list[str],
        exclude_patterns: list[str],
        max_files: int = 500,
    ) -> list[dict]:
        roots = self.safety.validate_watch_folders(watch_folders)
        results: list[dict] = []
        try:
            with FilesystemMCPSession(self.safety.allowed_root) as session:
                listed = session.call_tool(
                    "list_files",
                    {"target_paths": [str(root) for root in roots], "exclude_patterns": exclude_patterns},
                )
                if not isinstance(listed, list):
                    raise MCPProtocolError("MCPのファイル一覧応答が不正です。")
                for raw_path in listed:
                    info = self._build_file_info(session, Path(str(raw_path)))
                    if info:
                        results.append(info)
                    if len(results) >= max_files:
                        break
        except MCPProtocolError:
            logger.exception("filesystem MCP scan failed")
            raise
        return sorted(results, key=lambda x: x["path"])

    def _build_file_info(self, session: FilesystemMCPSession, path: Path) -> dict | None:
        if self.safety.is_symlink_or_junction(path):
            return None
        try:
            metadata = session.call_tool("get_metadata", {"path": str(path)})
        except MCPProtocolError:
            return None
        if not isinstance(metadata, dict):
            return None
        now = datetime.now(timezone.utc).timestamp()
        days_since_access = int((now - float(metadata["accessed_at"])) / 86400)
        size_kb = round(int(metadata["size"]) / 1024, 1)
        preview = self._read_preview(session, path)
        return {
            "path": str(path),
            "ext": path.suffix.lower(),
            "size_kb": size_kb,
            "days_since_access": days_since_access,
            "preview": preview,
            "is_forbidden": self.safety.is_forbidden_extension(path),
        }

    @staticmethod
    def _read_preview(session: FilesystemMCPSession, path: Path, max_chars: int = 300) -> str:
        if path.suffix.lower() not in _TEXT_EXTENSIONS:
            return ""
        try:
            payload = session.call_tool("read_file", {"path": str(path)})
            if not isinstance(payload, dict):
                return ""
            raw = base64.b64decode(str(payload["content_base64"]), validate=True)
            return raw.decode("utf-8", errors="ignore")[:max_chars]
        except (KeyError, ValueError, MCPProtocolError):
            return ""
