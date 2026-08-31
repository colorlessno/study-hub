"""音声文字起こしサービス（faster-whisper 実装）

設計方針（基本設計書 セクション2.2）:
    - 音声入力は「faster-whisper → SOAPGenerator」の直列処理
    - 失敗時は元音声を保持せず再入力を促す
    - ローカル処理のみ（院外送信禁止）

環境変数（settings.py 経由）:
    WHISPER_MODEL_SIZE : tiny / base / small / medium / large-v3  （デフォルト: medium）
    WHISPER_DEVICE     : cpu / cuda                               （デフォルト: cpu）
    WHISPER_COMPUTE_TYPE: int8 / float16                          （デフォルト: int8）

備考:
    - GPU (CUDA) を使う場合は WHISPER_DEVICE=cuda / WHISPER_COMPUTE_TYPE=float16 を .env に設定する
    - Docker コンテナ内で CUDA を使う場合は nvidia-container-toolkit が必要
    - モデルは初回呼び出し時に ~/.cache/huggingface へ自動ダウンロードされる
      オフライン環境では事前に volume mount するか TRANSFORMERS_OFFLINE=1 を設定する
"""
from __future__ import annotations

import asyncio
import logging
import tempfile
from pathlib import Path
from functools import lru_cache

from studyai.common.config.settings import get_settings
from studyai.common.errors.models import ExternalServiceError, ValidationAppError

logger = logging.getLogger(__name__)

_SUPPORTED_SUFFIXES = (".wav", ".mp3", ".m4a", ".mp4", ".webm")


@lru_cache(maxsize=1)
def _load_model():
    """WhisperModel をプロセス内でシングルトンとしてロードする。

    lru_cache(maxsize=1) により、初回呼び出し時のみモデルをメモリにロードし
    以降は同一インスタンスを再利用してロードコストを回避する。
    """
    try:
        from faster_whisper import WhisperModel  # type: ignore
    except ImportError as exc:
        raise ExternalServiceError(
            "transcriber_unavailable",
            "faster-whisper is not installed. Run: pip install faster-whisper",
            503,
        ) from exc

    settings = get_settings()
    logger.info(
        "Loading WhisperModel: size=%s device=%s compute_type=%s",
        settings.whisper_model_size,
        settings.whisper_device,
        settings.whisper_compute_type,
    )
    try:
        model = WhisperModel(
            settings.whisper_model_size,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
        )
    except Exception as exc:
        logger.exception("WhisperModel load failed: %s", exc)
        raise ExternalServiceError(
            "transcriber_load_failed",
            f"Failed to load WhisperModel: {exc}",
            503,
        ) from exc

    logger.info("WhisperModel loaded successfully.")
    return model


def _transcribe_sync(file_bytes: bytes, suffix: str, language: str) -> str:
    """同期処理ブロック（asyncio.to_thread 経由で呼び出す）。

    一時ファイルに音声を書き出し → transcribe → テキストを結合して返す。
    一時ファイルは関数終了時に必ず削除される。
    """
    model = _load_model()

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        segments, info = model.transcribe(
            tmp_path,
            language=language if language else None,  # None で自動検出
            beam_size=5,
            vad_filter=True,           # 無音区間を自動スキップ（精度向上）
            vad_parameters={"min_silence_duration_ms": 500},
        )
        logger.info(
            "Transcription detected language=%s probability=%.2f",
            info.language,
            info.language_probability,
        )
        text = " ".join(seg.text.strip() for seg in segments if seg.text.strip())
        return text
    except Exception as exc:
        logger.exception("Transcription failed: %s", exc)
        raise ExternalServiceError(
            "transcription_failed",
            f"Audio transcription failed: {exc}",
            500,
        ) from exc
    finally:
        # 元音声を保持しない（基本設計書 ガードレール設計）
        Path(tmp_path).unlink(missing_ok=True)


class VoiceTranscriber:
    """音声ファイルをテキストに変換するサービス。

    Args:
        language: 言語コード（"ja", "en" など）。None で自動検出。
    """

    def __init__(self, language: str = "ja") -> None:
        self._language = language

    async def transcribe_audio(self, *, file_name: str, file_bytes: bytes) -> str:
        """音声バイトを受け取り、日本語テキストを返す。

        Args:
            file_name: 元のファイル名（拡張子バリデーションに使用）。
            file_bytes: 音声ファイルのバイト列。

        Returns:
            文字起こしテキスト。

        Raises:
            ValidationAppError: 非対応フォーマットの場合。
            ExternalServiceError: 文字起こし処理失敗・ライブラリ未インストールの場合。
        """
        lowered = file_name.lower()
        if not lowered.endswith(_SUPPORTED_SUFFIXES):
            raise ValidationAppError(
                "invalid_audio_format",
                f"Unsupported audio format. Supported: {', '.join(_SUPPORTED_SUFFIXES)}",
            )

        if not file_bytes:
            raise ValidationAppError("empty_audio_file", "Audio file is empty.")

        suffix = Path(lowered).suffix  # ".wav" / ".mp3" など

        # faster-whisper の transcribe は同期 I/O なので to_thread で非同期化
        text = await asyncio.to_thread(
            _transcribe_sync, file_bytes, suffix, self._language
        )

        if not text:
            raise ExternalServiceError(
                "transcription_empty",
                "Transcription returned empty result. Please check the audio quality.",
                422,
            )

        logger.info(
            "Transcription complete: file=%s chars=%d",
            file_name,
            len(text),
        )
        return text
