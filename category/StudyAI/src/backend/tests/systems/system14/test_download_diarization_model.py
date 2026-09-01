from pathlib import Path

import pytest

from studyai.systems.system14.tools.download_diarization_model import (
    MODEL_REPOSITORY,
    download_model,
    verify_local_model,
)


def test_download_model_uses_one_worker(tmp_path: Path) -> None:
    received: dict[str, object] = {}

    def fake_download(**arguments: object) -> str:
        received.update(arguments)
        (tmp_path / "config.yaml").write_text("version: 1\n", encoding="utf-8")
        return str(tmp_path)

    result = download_model(
        token="test-token",
        model_directory=tmp_path,
        snapshot_downloader=fake_download,
    )

    assert result == tmp_path
    assert received == {
        "repo_id": MODEL_REPOSITORY,
        "local_dir": str(tmp_path),
        "max_workers": 1,
        "token": "test-token",
    }


def test_download_model_rejects_missing_token(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="read token"):
        download_model(token="", model_directory=tmp_path)


def test_verify_local_model_loads_downloaded_directory(tmp_path: Path) -> None:
    (tmp_path / "config.yaml").write_text("version: 1\n", encoding="utf-8")
    loaded: list[str] = []

    def fake_loader(path: str) -> object:
        loaded.append(path)
        return object()

    verify_local_model(tmp_path, pipeline_loader=fake_loader)

    assert loaded == [str(tmp_path)]
