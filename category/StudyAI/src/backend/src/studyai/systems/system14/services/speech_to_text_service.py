from __future__ import annotations

from studyai.systems.system05.services.voice_transcriber import VoiceTranscriber


class SpeechToTextService:
    def __init__(self) -> None:
        self.voice_transcriber = VoiceTranscriber(language="ja")

    async def transcribe_with_speakers(self, *, file_name: str, file_bytes: bytes) -> list[dict]:
        transcript = await self.voice_transcriber.transcribe_audio(
            file_name=file_name,
            file_bytes=file_bytes,
        )
        return [
            {
                "speaker": "unknown",
                "text": transcript,
                "start_sec": None,
                "end_sec": None,
            }
        ]
