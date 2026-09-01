from __future__ import annotations

from types import SimpleNamespace

import pytest

from studyai.systems.system05.services import voice_transcriber as module
from studyai.systems.system05.services.voice_transcriber import VoiceTranscriber


class _FakeWhisperModel:
    def transcribe(self, _path: str, **_kwargs: object) -> tuple[list[SimpleNamespace], SimpleNamespace]:
        return (
            [
                SimpleNamespace(text=" 最初の発話 ", start=0.5, end=1.75),
                SimpleNamespace(text="", start=1.75, end=2.0),
                SimpleNamespace(text="次の発話", start=2.0, end=3.25),
            ],
            SimpleNamespace(language="ja", language_probability=0.99),
        )


def test_transcribe_segments_sync_keeps_whisper_timestamps(monkeypatch) -> None:
    monkeypatch.setattr(module, "_load_model", lambda: _FakeWhisperModel())

    segments = module._transcribe_segments_sync(b"audio", ".wav", "ja")

    assert segments == [
        {"text": "最初の発話", "start_sec": 0.5, "end_sec": 1.75},
        {"text": "次の発話", "start_sec": 2.0, "end_sec": 3.25},
    ]


@pytest.mark.asyncio
async def test_transcribe_audio_keeps_existing_full_text_interface(monkeypatch) -> None:
    monkeypatch.setattr(
        module,
        "_transcribe_segments_sync",
        lambda *_args: [
            {"text": "最初の発話", "start_sec": 0.5, "end_sec": 1.75},
            {"text": "次の発話", "start_sec": 2.0, "end_sec": 3.25},
        ],
    )

    text = await VoiceTranscriber().transcribe_audio(file_name="call.wav", file_bytes=b"audio")

    assert text == "最初の発話 次の発話"
