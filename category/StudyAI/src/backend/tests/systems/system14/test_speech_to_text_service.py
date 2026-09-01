from __future__ import annotations

import pytest

from studyai.systems.system14.services.speech_to_text_service import SpeechToTextService


class _FakeVoiceTranscriber:
    async def transcribe_segments(self, *, file_name: str, file_bytes: bytes) -> list[dict]:
        assert file_name == "call.wav"
        assert file_bytes == b"audio"
        return [
            {"text": "配送について確認します。", "start_sec": 0.25, "end_sec": 1.75},
            {"text": "到着が遅れています。", "start_sec": 2.1, "end_sec": 3.8},
        ]


class _FakeSpeakerDiarizer:
    def diarize(self, *, file_name: str, file_bytes: bytes) -> list[dict]:
        assert file_name == "call.wav"
        assert file_bytes == b"audio"
        return [
            {"speaker": "SPEAKER_00", "start_sec": 0.0, "end_sec": 1.5},
            {"speaker": "SPEAKER_01", "start_sec": 1.5, "end_sec": 4.0},
        ]


@pytest.mark.asyncio
async def test_speech_to_text_assigns_speaker_with_maximum_time_overlap() -> None:
    service = SpeechToTextService()
    service.voice_transcriber = _FakeVoiceTranscriber()
    service.speaker_diarizer = _FakeSpeakerDiarizer()

    segments = await service.transcribe_with_speakers(file_name="call.wav", file_bytes=b"audio")

    assert segments == [
        {
            "speaker": "SPEAKER_00",
            "text": "配送について確認します。",
            "start_sec": 0.25,
            "end_sec": 1.75,
        },
        {
            "speaker": "SPEAKER_01",
            "text": "到着が遅れています。",
            "start_sec": 2.1,
            "end_sec": 3.8,
        },
    ]
