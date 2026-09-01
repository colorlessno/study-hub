from pathlib import Path

import pytest

from studyai.common.errors.models import ExternalServiceError
from studyai.systems.system14.services.speaker_diarization_service import (
    SpeakerDiarizationService,
    _load_pipeline,
    assign_speakers,
)


def test_assign_speakers_keeps_unknown_when_no_turn_overlaps() -> None:
    result = assign_speakers(
        [{"text": "確認します。", "start_sec": 4.0, "end_sec": 5.0}],
        [{"speaker": "SPEAKER_00", "start_sec": 0.0, "end_sec": 3.0}],
    )

    assert result == [
        {
            "speaker": "unknown",
            "text": "確認します。",
            "start_sec": 4.0,
            "end_sec": 5.0,
        }
    ]


def test_assign_speakers_uses_first_turn_when_overlap_is_tied() -> None:
    result = assign_speakers(
        [{"text": "重複区間", "start_sec": 1.0, "end_sec": 3.0}],
        [
            {"speaker": "SPEAKER_00", "start_sec": 1.0, "end_sec": 2.0},
            {"speaker": "SPEAKER_01", "start_sec": 2.0, "end_sec": 3.0},
        ],
    )

    assert result[0]["speaker"] == "SPEAKER_00"


def test_diarize_rejects_missing_local_model(tmp_path: Path) -> None:
    _load_pipeline.cache_clear()
    service = SpeakerDiarizationService(model_directory=tmp_path / "missing-model")

    with pytest.raises(ExternalServiceError) as error:
        service.diarize(file_name="call.wav", file_bytes=b"audio")

    assert error.value.error_code == "speaker_diarization_model_missing"
