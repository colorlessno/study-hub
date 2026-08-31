import subprocess
import sys

import pytest

from studyai.common.mcp.filesystem_client import MCPProtocolError
from studyai.common.mcp.filesystem_client import FilesystemMCPSession


def test_filesystem_mcp_session_initializes_and_lists_files(tmp_path) -> None:
    (tmp_path / "sample.txt").write_text("sample", encoding="utf-8")

    with FilesystemMCPSession(tmp_path) as session:
        result = session.call_tool("list_files", {"target_paths": [str(tmp_path)]})

    assert str(tmp_path / "sample.txt") in result


def test_filesystem_mcp_session_stops_unresponsive_process(tmp_path) -> None:
    session = FilesystemMCPSession(tmp_path, request_timeout_seconds=0.05)
    process = subprocess.Popen(
        [sys.executable, "-c", "import time; time.sleep(60)"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    session._process = process

    with pytest.raises(MCPProtocolError, match="制限時間"):
        session._readline(process)

    assert process.poll() is not None
