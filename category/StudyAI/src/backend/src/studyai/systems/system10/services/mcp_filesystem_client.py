from __future__ import annotations

import base64
from dataclasses import dataclass
from pathlib import Path

from studyai.common.mcp.filesystem_client import FilesystemMCPSession, MCPProtocolError
from studyai.common.errors.models import AppError, ValidationAppError


@dataclass(frozen=True)
class MCPFile:
    path: Path
    content: bytes
    size: int
    modified_at: float


class MCPFilesystemClient:
    DEFAULT_ALLOWED_ROOT = Path("/mnt/scan/project")

    SUPPORTED_EXTENSIONS = {
        ".pdf",
        ".docx",
        ".xlsx",
        ".pptx",
        ".txt",
        ".md",
        ".py",
        ".js",
        ".ts",
        ".java",
        ".sql",
        ".sh",
        ".yaml",
        ".yml",
        ".json",
        ".xml",
    }

    def __init__(self, allowed_root: Path | None = None) -> None:
        self.allowed_root = (allowed_root or self.DEFAULT_ALLOWED_ROOT).resolve()

    def list_files(self, target_paths: list[str], exclude_patterns: list[str]) -> list[Path]:
        self._validate_targets(target_paths)
        try:
            with FilesystemMCPSession(self.allowed_root) as session:
                payload = session.call_tool(
                    "list_files",
                    {"target_paths": target_paths, "exclude_patterns": exclude_patterns},
                )
        except MCPProtocolError as exc:
            raise ValidationAppError("filesystem_mcp_failed", str(exc)) from exc
        if not isinstance(payload, list):
            raise ValidationAppError("filesystem_mcp_invalid_response", "MCPのファイル一覧応答が不正です。")
        return [Path(str(item)) for item in payload]

    def scan_files(self, target_paths: list[str], exclude_patterns: list[str]) -> list[MCPFile]:
        self._validate_targets(target_paths)
        try:
            with FilesystemMCPSession(self.allowed_root) as session:
                listed = session.call_tool(
                    "list_files",
                    {"target_paths": target_paths, "exclude_patterns": exclude_patterns},
                )
                if not isinstance(listed, list):
                    raise MCPProtocolError("MCPのファイル一覧応答が不正です。")
                files: list[MCPFile] = []
                for raw_path in listed:
                    path = Path(str(raw_path))
                    content_payload = session.call_tool("read_file", {"path": str(path)})
                    metadata_payload = session.call_tool("get_metadata", {"path": str(path)})
                    if not isinstance(content_payload, dict) or not isinstance(metadata_payload, dict):
                        raise MCPProtocolError("MCPのファイル応答が不正です。")
                    files.append(
                        MCPFile(
                            path=path,
                            content=base64.b64decode(str(content_payload["content_base64"]), validate=True),
                            size=int(metadata_payload["size"]),
                            modified_at=float(metadata_payload["modified_at"]),
                        )
                    )
                return files
        except (KeyError, ValueError, MCPProtocolError) as exc:
            raise ValidationAppError("filesystem_mcp_failed", str(exc)) from exc

    def _validate_targets(self, target_paths: list[str]) -> None:
        if not target_paths:
            raise ValidationAppError("invalid_scan_targets", "scan_targets は1件以上必要です。")
        for raw_path in target_paths:
            path = Path(raw_path)
            if not path.is_absolute():
                raise AppError("path_out_of_scope", "絶対パスのみスキャンできます。", 403, {"path": raw_path})
            path = path.resolve()
            try:
                path.relative_to(self.allowed_root)
            except ValueError as exc:
                raise AppError(
                    "path_out_of_scope",
                    f"スキャンできる範囲は {self.allowed_root} 配下だけです。",
                    403,
                    {"path": raw_path, "allowed_root": str(self.allowed_root)},
                ) from exc
            if not path.exists():
                raise ValidationAppError(
                    "scan_target_not_found",
                    "指定した対象フォルダまたはファイルが見つかりません。",
                    {"path": raw_path},
                )
