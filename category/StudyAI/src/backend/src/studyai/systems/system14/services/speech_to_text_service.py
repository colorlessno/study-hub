from __future__ import annotations

from studyai.systems.system05.services.voice_transcriber import VoiceTranscriber
from studyai.systems.system14.services.speaker_diarization_service import (
    SpeakerDiarizationService,
    assign_speakers,
)


class SpeechToTextService:
    def __init__(self) -> None:
        self.voice_transcriber = VoiceTranscriber(language="ja")
        self.speaker_diarizer = SpeakerDiarizationService()

    async def transcribe_with_speakers(self, *, file_name: str, file_bytes: bytes) -> list[dict]:
        transcript_segments = await self.voice_transcriber.transcribe_segments(
            file_name=file_name,
            file_bytes=file_bytes,
        )
        diarization_turns = self.speaker_diarizer.diarize(
            file_name=file_name,
            file_bytes=file_bytes,
        )
        return assign_speakers(transcript_segments, diarization_turns)
