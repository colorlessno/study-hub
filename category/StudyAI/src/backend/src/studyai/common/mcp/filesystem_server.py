from __future__ import annotations

import argparse
import base64
import json
import shutil
import sys
from fnmatch import fnmatch
from pathlib import Path


class FilesystemMCPServer:
    """Small, read-only MCP filesystem server for the learning environment."""

    def __init__(self, allowed_root: Path) -> None:
        self.allowed_root = allowed_root.resolve()

    def handle(self, message: dict[str, object]) -> dict[str, object] | None:
        method = message.get("method")
        request_id = message.get("id")
        if method == "notifications/initialized":
            return None
        if method == "initialize":
            return self._result(
                request_id,
                {
                    "protocolVersion": "2025-03-26",
                    "capabilities": {"tools": {}},
                    "serverInfo": {"name": "studyai-filesystem", "version": "1.0.0"},
                },
            )
        if method == "tools/list":
            return self._result(
                request_id,
                {
                    "tools": [
                        {"name": "list_files", "description": "許可範囲内のファイルを列挙する"},
                        {"name": "read_file", "description": "許可範囲内のファイルを読み取る"},
                        {"name": "get_metadata", "description": "許可範囲内のファイル情報を取得する"},
                        {"name": "move_file", "description": "許可範囲内でファイルを移動または名前変更する"},
                    ]
                },
            )
        if method == "tools/call":
            params = message.get("params")
            if not isinstance(params, dict):
                return self._error(request_id, -32602, "params must be an object")
            name = params.get("name")
            arguments = params.get("arguments")
            if not isinstance(arguments, dict):
                arguments = {}
            try:
                payload = self._call_tool(str(name), arguments)
            except (OSError, ValueError) as exc:
                return self._error(request_id, -32001, str(exc))
            return self._result(
                request_id,
                {"content": [{"type": "text", "text": json.dumps(payload, ensure_ascii=False)}]},
            )
        if method == "shutdown":
            return self._result(request_id, None)
        return self._error(request_id, -32601, f"unknown method: {method}")

    def _call_tool(self, name: str, arguments: dict[str, object]) -> object:
        if name == "list_files":
            raw_targets = arguments.get("target_paths")
            raw_excludes = arguments.get("exclude_patterns")
            if not isinstance(raw_targets, list) or not raw_targets:
                raise ValueError("target_paths は1件以上必要です。")
            excludes = [str(item) for item in raw_excludes] if isinstance(raw_excludes, list) else []
            files: list[str] = []
            for raw_target in raw_targets:
                target = self._resolve_allowed(str(raw_target))
                if not target.exists():
                    raise ValueError(f"指定した対象が見つかりません: {raw_target}")
                candidates = [target] if target.is_file() else target.rglob("*")
                for candidate in candidates:
                    if candidate.is_file() and not self._is_excluded(candidate, excludes):
                        files.append(str(candidate))
            return sorted(set(files), key=str.lower)
        if name == "read_file":
            path = self._resolve_allowed(str(arguments.get("path", "")))
            if not path.is_file():
                raise ValueError(f"ファイルが見つかりません: {path}")
            return {"path": str(path), "content_base64": base64.b64encode(path.read_bytes()).decode("ascii")}
        if name == "get_metadata":
            path = self._resolve_allowed(str(arguments.get("path", "")))
            if not path.is_file():
                raise ValueError(f"ファイルが見つかりません: {path}")
            stat = path.stat()
            return {
                "path": str(path),
                "size": stat.st_size,
                "modified_at": stat.st_mtime,
                "accessed_at": stat.st_atime,
                "is_symlink": path.is_symlink(),
            }
        if name == "move_file":
            source = self._resolve_allowed(str(arguments.get("source_path", "")))
            destination = self._resolve_allowed(str(arguments.get("destination_path", "")))
            if not source.is_file():
                raise ValueError(f"移動元ファイルが見つかりません: {source}")
            if destination.exists():
                raise ValueError(f"移動先に同名ファイルがあります: {destination}")
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(source), str(destination))
            return {"source_path": str(source), "destination_path": str(destination)}
        raise ValueError(f"未対応のMCPツールです: {name}")

    def _resolve_allowed(self, raw_path: str) -> Path:
        path = Path(raw_path)
        if not path.is_absolute():
            raise ValueError("絶対パスのみ指定できます。")
        resolved = path.resolve()
        try:
            resolved.relative_to(self.allowed_root)
        except ValueError as exc:
            raise ValueError(f"許可範囲外です: {resolved}") from exc
        return resolved

    @staticmethod
    def _is_excluded(path: Path, patterns: list[str]) -> bool:
        full_path = str(path).replace("\\", "/")
        for pattern in patterns:
            normalized = pattern.replace("\\", "/")
            if fnmatch(full_path, normalized) or fnmatch(path.name, normalized) or normalized in path.parts:
                return True
        return False

    @staticmethod
    def _result(request_id: object, result: object) -> dict[str, object]:
        return {"jsonrpc": "2.0", "id": request_id, "result": result}

    @staticmethod
    def _error(request_id: object, code: int, message: str) -> dict[str, object]:
        return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    args = parser.parse_args()
    server = FilesystemMCPServer(Path(args.root))
    for line in sys.stdin:
        message = json.loads(line)
        response = server.handle(message)
        if response is not None:
            sys.stdout.write(json.dumps(response, ensure_ascii=False) + "\n")
            sys.stdout.flush()
        if message.get("method") == "shutdown":
            break


if __name__ == "__main__":
    main()
