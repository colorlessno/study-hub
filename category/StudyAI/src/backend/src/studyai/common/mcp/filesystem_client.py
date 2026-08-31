from __future__ import annotations

import ctypes
import json
import os
import select
import subprocess
import sys
import time
from pathlib import Path


class MCPProtocolError(RuntimeError):
    pass


class FilesystemMCPSession:
    """Sequential JSON-RPC client for the local filesystem MCP server."""

    def __init__(self, allowed_root: Path, *, request_timeout_seconds: float = 5.0) -> None:
        self.allowed_root = allowed_root.resolve()
        self.request_timeout_seconds = request_timeout_seconds
        self._next_id = 1
        self._process: subprocess.Popen[bytes] | None = None
        self._stdout_buffer = bytearray()

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
        )
        try:
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
        except BaseException:
            self._terminate_process()
            raise
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        process = self._process
        if process is None:
            return
        try:
            if process.poll() is None:
                self._request("shutdown", {})
        except MCPProtocolError:
            pass
        finally:
            self._terminate_process()

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
        line = self._readline(process)
        if not line:
            stderr = ""
            if process.poll() is not None and process.stderr is not None:
                stderr = process.stderr.read().decode("utf-8", errors="replace")
            raise MCPProtocolError(f"filesystem MCP server が応答しませんでした。{stderr}")
        response = json.loads(line)
        if not isinstance(response, dict):
            raise MCPProtocolError("filesystem MCP server の応答が不正です。")
        return response

    def _write(self, message: dict[str, object]) -> None:
        process = self._require_process()
        assert process.stdin is not None
        process.stdin.write((json.dumps(message, ensure_ascii=False) + "\n").encode("utf-8"))
        process.stdin.flush()

    def _readline(self, process: subprocess.Popen[bytes]) -> str:
        assert process.stdout is not None
        deadline = time.monotonic() + self.request_timeout_seconds
        while time.monotonic() < deadline:
            newline_index = self._stdout_buffer.find(b"\n")
            if newline_index >= 0:
                line = bytes(self._stdout_buffer[:newline_index])
                del self._stdout_buffer[: newline_index + 1]
                return line.decode("utf-8")

            available = self._available_stdout_bytes(process)
            if available > 0:
                chunk = os.read(process.stdout.fileno(), min(available, 4096))
                if chunk:
                    self._stdout_buffer.extend(chunk)
                    continue
            if process.poll() is not None:
                if self._stdout_buffer:
                    line = bytes(self._stdout_buffer)
                    self._stdout_buffer.clear()
                    return line.decode("utf-8")
                return ""
            time.sleep(0.01)

        self._terminate_process()
        raise MCPProtocolError("filesystem MCP server の応答が制限時間を超えました。")

    @staticmethod
    def _available_stdout_bytes(process: subprocess.Popen[bytes]) -> int:
        assert process.stdout is not None
        if sys.platform != "win32":
            readable, _, _ = select.select([process.stdout], [], [], 0)
            return 4096 if readable else 0

        import msvcrt

        available = ctypes.c_ulong(0)
        handle = msvcrt.get_osfhandle(process.stdout.fileno())
        success = ctypes.windll.kernel32.PeekNamedPipe(
            ctypes.c_void_p(handle),
            None,
            0,
            None,
            ctypes.byref(available),
            None,
        )
        return int(available.value) if success else 0

    def _terminate_process(self) -> None:
        process = self._process
        if process is None:
            return
        if process.stdin is not None and not process.stdin.closed:
            process.stdin.close()
        if process.poll() is None:
            try:
                process.terminate()
                process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=2)
        self._process = None
        self._stdout_buffer.clear()

    def _require_process(self) -> subprocess.Popen[bytes]:
        if self._process is None:
            raise MCPProtocolError("filesystem MCP session が開始されていません。")
        return self._process
