from __future__ import annotations

from studyai.systems.system05.services.voice_transcriber import VoiceTranscriber


class SpeechToTextService:
    def __init__(self) -> None:
        self.voice_transcriber = VoiceTranscriber(language="ja")

    async def transcribe_with_speakers(self, *, file_name: str, file_bytes: bytes) -> list[dict]:
        transcript_segments = await self.voice_transcriber.transcribe_segments(
            file_name=file_name,
            file_bytes=file_bytes,
        )
        return [
            {
                "speaker": "unknown",
                "text": segment["text"],
                "start_sec": segment["start_sec"],
                "end_sec": segment["end_sec"],
            }
            for segment in transcript_segments
        ]
