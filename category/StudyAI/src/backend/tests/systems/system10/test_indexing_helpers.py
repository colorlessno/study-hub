from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest

from studyai.common.errors.models import AppError, ValidationAppError
from studyai.systems.system10.services.indexing_service import IndexingService
from studyai.systems.system10.services.mcp_filesystem_client import MCPFilesystemClient


def test_filesystem_client_limits_scan_to_the_learning_directory(tmp_path: Path) -> None:
    learning_root = tmp_path / "learning"
    learning_root.mkdir()
    target = learning_root / "requirements.md"
    target.write_text("要件を確認する", encoding="utf-8")
    outside = tmp_path / "outside.md"
    outside.write_text("対象外", encoding="utf-8")
    client = MCPFilesystemClient(allowed_root=learning_root)

    assert client.list_files([str(learning_root)], []) == [target]
    with pytest.raises(AppError) as error:
        client.list_files([str(outside)], [])
    assert error.value.error_code == "path_out_of_scope"


def test_filesystem_client_rejects_a_missing_target(tmp_path: Path) -> None:
    client = MCPFilesystemClient(allowed_root=tmp_path)

    with pytest.raises(ValidationAppError) as error:
        client.list_files([str(tmp_path / "missing")], [])
    assert error.value.error_code == "scan_target_not_found"


def test_filesystem_client_reads_content_and_metadata_through_mcp(tmp_path: Path) -> None:
    learning_root = tmp_path / "learning"
    learning_root.mkdir()
    target = learning_root / "requirements.md"
    target.write_text("MCP経由で要件を確認する", encoding="utf-8")
    client = MCPFilesystemClient(allowed_root=learning_root)

    files = client.scan_files([str(learning_root)], [])

    assert len(files) == 1
    assert files[0].path == target
    assert files[0].content.decode("utf-8") == "MCP経由で要件を確認する"
    assert files[0].size == target.stat().st_size


def test_local_fallback_builds_a_searchable_768_dimension_vector() -> None:
    summary = IndexingService._fallback_summary("basic-design-old.md", "検索画面の基本設計です。")
    vector = IndexingService._local_embedding("検索画面の基本設計")

    assert summary["doc_type"] == "設計書"
    assert summary["is_latest"] is False
    assert len(vector) == 768
    assert sum(value * value for value in vector) == pytest.approx(1.0)


def test_duplicate_map_uses_actual_file_names_and_paths() -> None:
    files = [
        SimpleNamespace(id=1, file_name="basic-design.md", full_path="/learning/design/basic-design.md"),
        SimpleNamespace(id=2, file_name="basic-design-copy.md", full_path="/learning/archive/basic-design-copy.md"),
    ]
    groups = [SimpleNamespace(file_ids=[1, 2], similarity_score=1.0)]

    result = IndexingService._build_duplicate_map(groups, files)

    assert result[1] == [
        {
            "file_name": "basic-design-copy.md",
            "full_path": "/learning/archive/basic-design-copy.md",
            "similarity": 1.0,
        }
    ]
