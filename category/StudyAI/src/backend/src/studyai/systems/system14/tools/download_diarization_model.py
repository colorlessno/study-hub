"""system14 の話者分離モデルをローカル保存する。"""

from __future__ import annotations

import os
import sys
from collections.abc import Callable
from pathlib import Path
from typing import Any

MODEL_REPOSITORY = "pyannote/speaker-diarization-community-1"
DEFAULT_MODEL_DIRECTORY = Path(
    "/app/backend/models/system14/pyannote-speaker-diarization-community-1"
)


def resolve_token() -> str:
    """環境変数からアクセストークンを取得する。"""

    return os.getenv("HF_TOKEN", "").strip() or os.getenv(
        "HUGGINGFACE_TOKEN", ""
    ).strip()


def resolve_model_directory() -> Path:
    """モデルの保存先を取得する。"""

    configured = os.getenv("SYSTEM14_DIARIZATION_MODEL_DIR", "").strip()
    return Path(configured) if configured else DEFAULT_MODEL_DIRECTORY


def download_model(
    *,
    token: str,
    model_directory: Path,
    snapshot_downloader: Callable[..., str] | None = None,
) -> Path:
    """モデル一式を1ワーカーで取得する。"""

    if not token:
        raise ValueError("Hugging Face の read token が設定されていません。")

    model_directory.mkdir(parents=True, exist_ok=True)
    if snapshot_downloader is None:
        from huggingface_hub import snapshot_download

        snapshot_downloader = snapshot_download

    downloaded_path = snapshot_downloader(
        repo_id=MODEL_REPOSITORY,
        local_dir=str(model_directory),
        max_workers=1,
        token=token,
    )
    return Path(downloaded_path)


def verify_local_model(
    model_directory: Path,
    *,
    pipeline_loader: Callable[[str], Any] | None = None,
) -> None:
    """必須ファイルとローカルパイプラインの読込みを検証する。"""

    configuration = model_directory / "config.yaml"
    if not configuration.is_file():
        raise FileNotFoundError(f"モデル設定が見つかりません: {configuration}")

    if pipeline_loader is None:
        from pyannote.audio import Pipeline

        pipeline_loader = Pipeline.from_pretrained

    pipeline = pipeline_loader(str(model_directory))
    if pipeline is None:
        raise RuntimeError("話者分離パイプラインを読み込めませんでした。")


def main() -> int:
    """モデルを取得し、ネットワークなしで利用できる形か検証する。"""

    token = resolve_token()
    model_directory = resolve_model_directory()
    print(f"system14 話者分離モデルを取得します: {MODEL_REPOSITORY}")
    print(f"保存先: {model_directory}")

    try:
        downloaded_path = download_model(
            token=token,
            model_directory=model_directory,
        )
        verify_local_model(downloaded_path)
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 2
    except Exception as error:
        print(
            "モデルの取得または読込み検証に失敗しました。"
            "モデルの利用条件への同意、トークン権限、ネットワークを確認してください。"
            f" モデルページ: https://huggingface.co/{MODEL_REPOSITORY}"
            f" ({type(error).__name__})",
            file=sys.stderr,
        )
        return 1

    print("system14 話者分離モデルの取得とローカル読込みを確認しました。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
