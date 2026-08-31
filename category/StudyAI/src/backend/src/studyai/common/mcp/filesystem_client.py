from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


class MCPProtocolError(RuntimeError):
    pass


class FilesystemMCPSession:
    """Sequential JSON-RPC client for the local filesystem MCP server."""

    def __init__(self, allowed_root: Path) -> None:
        self.allowed_root = allowed_root.resolve()
        self._next_id = 1
        self._process: subprocess.Popen[str] | None = None

    def __enter__(self) -> "FilesystemMCPSession":
        self._process = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "studyai.common.mcp.filesystem_server",
                "--root",
                str(self.allowed_root),
            ],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
        )
        self._request(
            "initialize",
            {
                "protocolVersion": "2025-03-26",
                "capabilities": {},
                "clientInfo": {"name": "studyai-backend", "version": "1.0.0"},
            },
        )
        self._notify("notifications/initialized", {})
        tools = self._request("tools/list", {})
        names = {str(item.get("name")) for item in tools.get("tools", []) if isinstance(item, dict)}
        required = {"list_files", "read_file", "get_metadata"}
        if not required.issubset(names):
            raise MCPProtocolError("filesystem MCP server の必要ツールを確認できません。")
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        process = self._process
        if process is None:
            return
        try:
            if process.poll() is None:
                self._request("shutdown", {})
        finally:
            if process.stdin is not None:
                process.stdin.close()
            try:
                process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                process.terminate()
                process.wait(timeout=2)
            self._process = None

    def call_tool(self, name: str, arguments: dict[str, object]) -> object:
        result = self._request("tools/call", {"name": name, "arguments": arguments})
        content = result.get("content")
        if not isinstance(content, list) or not content or not isinstance(content[0], dict):
            raise MCPProtocolError(f"MCPツール {name} の応答形式が不正です。")
        text = content[0].get("text")
        if not isinstance(text, str):
            raise MCPProtocolError(f"MCPツール {name} の本文がありません。")
        return json.loads(text)

    def _request(self, method: str, params: dict[str, object]) -> dict[str, object]:
        request_id = self._next_id
        self._next_id += 1
        response = self._exchange({"jsonrpc": "2.0", "id": request_id, "method": method, "params": params})
        if response.get("id") != request_id:
            raise MCPProtocolError("MCP応答IDが一致しません。")
        error = response.get("error")
        if isinstance(error, dict):
            raise MCPProtocolError(str(error.get("message", "MCP処理に失敗しました。")))
        result = response.get("result")
        return result if isinstance(result, dict) else {}

    def _notify(self, method: str, params: dict[str, object]) -> None:
        self._write({"jsonrpc": "2.0", "method": method, "params": params})

    def _exchange(self, message: dict[str, object]) -> dict[str, object]:
        self._write(message)
        process = self._require_process()
        assert process.stdout is not None
        line = process.stdout.readline()
        if not line:
            stderr = process.stderr.read() if process.stderr is not None else ""
            raise MCPProtocolError(f"filesystem MCP server が応答しませんでした。{stderr}")
        response = json.loads(line)
        if not isinstance(response, dict):
            raise MCPProtocolError("filesystem MCP server の応答が不正です。")
        return response

    def _write(self, message: dict[str, object]) -> None:
        process = self._require_process()
        assert process.stdin is not None
        process.stdin.write(json.dumps(message, ensure_ascii=False) + "\n")
        process.stdin.flush()

    def _require_process(self) -> subprocess.Popen[str]:
        if self._process is None:
            raise MCPProtocolError("filesystem MCP session が開始されていません。")
        return self._process
