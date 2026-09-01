from __future__ import annotations

import os
import tempfile
from functools import lru_cache
from pathlib import Path
from typing import Any

from studyai.common.errors.models import ExternalServiceError


DEFAULT_MODEL_DIRECTORY = Path(
    "/app/backend/models/system14/pyannote-speaker-diarization-community-1"
)


def resolve_model_directory() -> Path:
    configured = os.getenv("SYSTEM14_DIARIZATION_MODEL_DIR", "").strip()
    return Path(configured) if configured else DEFAULT_MODEL_DIRECTORY


@lru_cache(maxsize=1)
def _load_pipeline(model_directory: str) -> Any:
    configuration = Path(model_directory) / "config.yaml"
    if not configuration.is_file():
        raise ExternalServiceError(
            "speaker_diarization_model_missing",
            f"Speaker diarization model is not installed: {model_directory}",
            503,
        )

    try:
        from pyannote.audio import Pipeline
    except ImportError as exc:
        raise ExternalServiceError(
            "speaker_diarization_unavailable",
            "pyannote.audio is not installed in the system14 runtime.",
            503,
        ) from exc

    try:
        pipeline = Pipeline.from_pretrained(model_directory)
    except Exception as exc:
        raise ExternalServiceError(
            "speaker_diarization_load_failed",
            "Failed to load the local speaker diarization model.",
            503,
        ) from exc
    if pipeline is None:
        raise ExternalServiceError(
            "speaker_diarization_load_failed",
            "Failed to load the local speaker diarization model.",
            503,
        )
    return pipeline


def assign_speakers(
    transcript_segments: list[dict],
    diarization_turns: list[dict],
) -> list[dict]:
    """時刻の重なりが最大の話者を各文字起こし区間へ割り当てる。"""

    assigned: list[dict] = []
    for segment in transcript_segments:
        start_sec = float(segment["start_sec"])
        end_sec = float(segment["end_sec"])
        best_speaker = "unknown"
        best_overlap = 0.0
        for turn in diarization_turns:
            overlap = max(
                0.0,
                min(end_sec, float(turn["end_sec"]))
                - max(start_sec, float(turn["start_sec"])),
            )
            if overlap > best_overlap:
                best_overlap = overlap
                best_speaker = str(turn["speaker"])
        assigned.append(
            {
                "speaker": best_speaker,
                "text": segment["text"],
                "start_sec": start_sec,
                "end_sec": end_sec,
            }
        )
    return assigned


class SpeakerDiarizationService:
    def __init__(self, model_directory: Path | None = None) -> None:
        self.model_directory = model_directory or resolve_model_directory()

    def diarize(self, *, file_name: str, file_bytes: bytes) -> list[dict]:
        """ローカルモデルで話者区間を一件ずつ抽出する。"""

        suffix = Path(file_name.lower()).suffix or ".wav"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temporary:
            temporary.write(file_bytes)
            temporary_path = Path(temporary.name)

        try:
            pipeline = _load_pipeline(str(self.model_directory))
            output = pipeline(str(temporary_path))
            annotation = getattr(output, "exclusive_speaker_diarization", None)
            if annotation is None:
                annotation = getattr(output, "speaker_diarization", None)
            if annotation is None and hasattr(output, "itertracks"):
                annotation = output
            if annotation is None or not hasattr(annotation, "itertracks"):
                raise ExternalServiceError(
                    "speaker_diarization_invalid_output",
                    "Speaker diarization returned an unsupported result.",
                    500,
                )

            turns: list[dict] = []
            for turn, _, speaker in annotation.itertracks(yield_label=True):
                turns.append(
                    {
                        "speaker": str(speaker),
                        "start_sec": float(turn.start),
                        "end_sec": float(turn.end),
                    }
                )
            return turns
        except ExternalServiceError:
            raise
        except Exception as exc:
            raise ExternalServiceError(
                "speaker_diarization_failed",
                "Speaker diarization failed.",
                500,
            ) from exc
        finally:
            temporary_path.unlink(missing_ok=True)
