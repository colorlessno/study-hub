from __future__ import annotations

import os
import stat
from fnmatch import fnmatch
from pathlib import Path

from studyai.common.errors.models import AppError, ValidationAppError

# 操作を禁止するシステムパスの先頭一致リスト（Windows）
_SYSTEM_PATH_PREFIXES = [
    "c:\\windows",
    "c:\\program files",
    "c:\\program files (x86)",
    "c:\\programdata",
    "c:\\system volume information",
]

# 移動禁止の拡張子
_FORBIDDEN_EXTENSIONS = {".exe", ".bat", ".msi", ".cmd", ".com", ".scr", ".pif"}


class PathSafetyService:
    DEFAULT_ALLOWED_ROOT = Path("/mnt/organize/work")

    def __init__(self, allowed_root: Path | None = None) -> None:
        self.allowed_root = (allowed_root or self.DEFAULT_ALLOWED_ROOT).resolve()

    def normalize(self, raw_path: str) -> Path:
        return Path(raw_path).resolve()

    def validate_scope(self, path: Path, allowed_roots: list[Path]) -> None:
        normalized = str(path).lower()
        for prefix in _SYSTEM_PATH_PREFIXES:
            if normalized == prefix or normalized.startswith(prefix + "\\") or normalized.startswith(prefix + "/"):
                raise AppError("unsafe_path_detected", "システムフォルダへの操作は禁止されています。", 403, {"path": str(path)})
        for root in allowed_roots:
            try:
                path.relative_to(root)
                return
            except ValueError:
                continue
        raise AppError("unsafe_path_detected", "監視フォルダ配下のパスのみ操作できます。", 403, {"path": str(path)})

    def is_forbidden_extension(self, path: Path) -> bool:
        return path.suffix.lower() in _FORBIDDEN_EXTENSIONS

    def is_symlink_or_junction(self, path: Path) -> bool:
        if path.is_symlink():
            return True
        # Windows reparse point （junction 含む）の検出
        try:
            st = os.lstat(str(path))
            if stat.S_ISLNK(st.st_mode):
                return True
            # FILE_ATTRIBUTE_REPARSE_POINT = 0x400
            if hasattr(st, "st_file_attributes") and (st.st_file_attributes & 0x400):
                return True
        except OSError:
            pass
        return False

    def is_conflict(self, dest: Path) -> bool:
        return dest.exists()

    def validate_watch_folders(self, watch_folders: list[str]) -> list[Path]:
        if not watch_folders:
            raise ValidationAppError("invalid_watch_folders", "watch_folders は1件以上必要です。")
        roots: list[Path] = []
        for raw in watch_folders:
            p = Path(raw)
            if not p.is_absolute():
                raise ValidationAppError("invalid_watch_folders", f"絶対パスで指定してください: {raw}")
            p = p.resolve()
            normalized = str(p).lower().rstrip("\\/")
            for prefix in _SYSTEM_PATH_PREFIXES:
                if normalized == prefix or normalized.startswith(prefix + "\\") or normalized.startswith(prefix + "/"):
                    raise AppError(
                        "unsafe_path_detected",
                        "システムフォルダは監視対象に指定できません。",
                        403,
                        {"path": raw},
                    )
            try:
                p.relative_to(self.allowed_root)
            except ValueError as exc:
                raise AppError(
                    "unsafe_path_detected",
                    f"教材で操作できる範囲は {self.allowed_root} 配下だけです。",
                    403,
                    {"path": raw, "allowed_root": str(self.allowed_root)},
                ) from exc
            if not p.is_dir():
                raise ValidationAppError(
                    "watch_folder_not_found",
                    "指定した監視フォルダが見つかりません。",
                    {"path": raw},
                )
            roots.append(p)
        return roots

    def validate_output_folder(self, output_folder: str) -> Path:
        output = Path(output_folder)
        if not output.is_absolute():
            raise ValidationAppError("invalid_output_folder", "整理先は絶対パスで指定してください。")
        output = output.resolve()
        try:
            output.relative_to(self.allowed_root)
        except ValueError as exc:
            raise AppError(
                "unsafe_path_detected",
                f"整理先に指定できる範囲は {self.allowed_root} 配下だけです。",
                403,
                {"path": output_folder, "allowed_root": str(self.allowed_root)},
            ) from exc
        if output == self.allowed_root:
            raise ValidationAppError("invalid_output_folder", "教材用作業フォルダ直下は整理先に指定できません。")
        if not output.is_dir():
            raise ValidationAppError(
                "output_folder_not_found",
                "指定した整理先フォルダが見つかりません。",
                {"path": output_folder},
            )
        return output

    def matches_exclude(self, path: Path, exclude_patterns: list[str]) -> bool:
        full = str(path).replace("\\", "/")
        for pattern in exclude_patterns:
            normalized = pattern.replace("\\", "/")
            if fnmatch(full, normalized):
                return True
            if any(part == pattern for part in path.parts):
                return True
        return False
