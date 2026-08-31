from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.config.settings import get_settings
from studyai.common.db.session import SessionLocal
from studyai.common.errors.models import ValidationAppError
from studyai.systems.system14.repositories.insight_repository import InsightRepository
from studyai.systems.system14.schemas.insight import JobStatus, JobStatusResponse, UploadAcceptedResponse
from studyai.systems.system14.services.grouping_service import GroupingService
from studyai.systems.system14.services.ingestion_normalizer import IngestionNormalizer
from studyai.systems.system14.services.pii_masker import PIIMasker
from studyai.systems.system14.services.sales_scoring_service import SalesScoringService
from studyai.systems.system14.services.speech_to_text_service import SpeechToTextService
from studyai.systems.system14.services.utterance_analyzer import UtteranceAnalyzer


class JobManager:
    ALLOWED_DATA_TYPES = {"audio", "video", "chat", "email", "call_log"}
    _ingestion_lock = asyncio.Lock()

    def __init__(self) -> None:
        self.settings = get_settings()
        self.normalizer = IngestionNormalizer()
        self.speech_to_text = SpeechToTextService()
        self.pii_masker = PIIMasker()
        self.analyzer = UtteranceAnalyzer()
        self.grouping_service = GroupingService()
        self.sales_scoring = SalesScoringService()

    async def upload_data(
        self,
        session: AsyncSession,
        *,
        file_name: str,
        file_bytes: bytes,
        data_type: str,
        source: str,
        metadata_raw: str | None,
    ) -> UploadAcceptedResponse:
        if data_type not in self.ALLOWED_DATA_TYPES:
            raise ValidationAppError("unsupported_source_data", "Unsupported data_type.")
        if not source.strip():
            raise ValidationAppError("empty_source", "source is required.")
        if not file_bytes:
            raise ValidationAppError("empty_upload_file", "file is empty.")
        max_bytes = self.settings.max_upload_size_mb * 1024 * 1024
        if len(file_bytes) > max_bytes:
            raise ValidationAppError("upload_file_too_large", "upload file is too large.")

        metadata = self._parse_metadata(metadata_raw)
        job_id = f"job_{uuid.uuid4().hex[:12]}"
        repo = InsightRepository(session)
        await repo.create_job(
            job_id=job_id,
            data_type=data_type,
            source=source,
            metadata=self.pii_masker.mask_metadata(metadata),
        )
        await session.commit()
        final_status = await self.process_job(
            job_id,
            file_name,
            file_bytes,
            data_type,
            source,
            metadata,
        )
        return UploadAcceptedResponse(
            job_id=job_id,
            status=final_status,
            estimated_minutes=0,
            data_type=data_type,
            file_count=1,
        )

    async def get_job(self, session: AsyncSession, *, job_id: str) -> JobStatusResponse:
        job = await InsightRepository(session).get_job(job_id)
        return JobStatusResponse(
            job_id=job.id,
            status=job.status,
            progress=job.progress,
            data_type=job.data_type,
            source=job.source,
            error_message=job.error_message,
            created_at=job.created_at,
            completed_at=job.completed_at,
        )

    async def process_job(
        self,
        job_id: str,
        file_name: str,
        file_bytes: bytes,
        data_type: str,
        source: str,
        metadata: dict,
    ) -> JobStatus:
        async with self._ingestion_lock:
            return await self._process_job(
                job_id,
                file_name,
                file_bytes,
                data_type,
                source,
                metadata,
            )

    async def _process_job(
        self,
        job_id: str,
        file_name: str,
        file_bytes: bytes,
        data_type: str,
        source: str,
        metadata: dict,
    ) -> JobStatus:
        async with SessionLocal() as session:
            repo = InsightRepository(session)
            try:
                await repo.update_job(job_id, status="running", progress=10)
                await session.commit()

                conversations = await self._normalize_input(
                    file_name=file_name,
                    file_bytes=file_bytes,
                    data_type=data_type,
                    source=source,
                    metadata=metadata,
                )
                await repo.update_job(job_id, progress=35)
                await session.commit()

                grouped_items: list[dict] = []
                for conversation in conversations:
                    safe_metadata = self.pii_masker.mask_metadata(conversation.get("metadata", {}))
                    analyzed_utterances: list[dict] = []
                    for utterance in conversation["utterances"]:
                        masked_text = self.pii_masker.mask(str(utterance.get("text") or ""))
                        analyzed = self.analyzer.analyze_utterance(
                            speaker=utterance.get("speaker"),
                            text=masked_text,
                        )
                        analyzed["start_sec"] = utterance.get("start_sec")
                        analyzed["end_sec"] = utterance.get("end_sec")
                        analyzed_utterances.append(analyzed)

                    summary = self._summarize(analyzed_utterances)
                    saved_conversation, saved_utterances = await repo.create_conversation(
                        job_id=job_id,
                        data_type=data_type,
                        source=source,
                        transcript="\n".join(item["text"] for item in analyzed_utterances),
                        summary=summary,
                        metadata=safe_metadata,
                        utterances=analyzed_utterances,
                    )
                    score = self.sales_scoring.score_sales_conversation(
                        analyzed_utterances,
                        safe_metadata,
                    )
                    await repo.create_sales_score(conversation_id=saved_conversation.id, score=score)
                    for row, analyzed in zip(saved_utterances, analyzed_utterances, strict=True):
                        grouped_items.append(
                            {
                                **analyzed,
                                "id": row.id,
                                "product": safe_metadata.get("product") or safe_metadata.get("product_name"),
                            }
                        )

                await repo.create_insight_groups(self.grouping_service.build_groups(grouped_items))
                await repo.update_job(job_id, status="completed", progress=100, completed_at=datetime.utcnow())
                await session.commit()
                return "completed"
            except Exception as exc:  # pragma: no cover - sequential ingestion failure path
                await session.rollback()
                await repo.update_job(
                    job_id,
                    status="failed",
                    progress=100,
                    error_message=str(exc),
                    completed_at=datetime.utcnow(),
                )
                await session.commit()
                return "failed"

    async def _normalize_input(
        self,
        *,
        file_name: str,
        file_bytes: bytes,
        data_type: str,
        source: str,
        metadata: dict,
    ) -> list[dict]:
        if data_type in {"audio", "video"}:
            segments = await self.speech_to_text.transcribe_with_speakers(file_name=file_name, file_bytes=file_bytes)
            return self.normalizer.normalize_transcript(
                transcript_segments=segments,
                data_type=data_type,
                source=source,
                metadata=metadata,
            )
        return self.normalizer.normalize_text_file(
            file_name=file_name,
            file_bytes=file_bytes,
            data_type=data_type,
            source=source,
            metadata=metadata,
        )

    @staticmethod
    def _parse_metadata(metadata_raw: str | None) -> dict:
        if metadata_raw in (None, ""):
            return {}
        try:
            payload = json.loads(metadata_raw)
        except json.JSONDecodeError as exc:
            raise ValidationAppError("invalid_metadata_json", "metadata must be valid JSON.") from exc
        if not isinstance(payload, dict):
            raise ValidationAppError("invalid_metadata_json", "metadata must be a JSON object.")
        return payload

    @staticmethod
    def _summarize(utterances: list[dict]) -> str:
        text = " ".join(str(item.get("text") or "") for item in utterances)
        return text[:240]
