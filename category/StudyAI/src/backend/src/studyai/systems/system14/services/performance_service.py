from __future__ import annotations

import json
from datetime import datetime
from time import perf_counter

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system14.repositories.insight_repository import InsightRepository
from studyai.systems.system14.schemas.insight import (
    PerformanceRunListResponse,
    PerformanceRunRequest,
    PerformanceRunResponse,
)
from studyai.systems.system14.services.job_manager import JobManager


class PerformanceService:
    SOURCE = "performance_validation"

    async def run(
        self,
        session: AsyncSession,
        *,
        body: PerformanceRunRequest,
    ) -> PerformanceRunResponse:
        file_bytes = json.dumps(
            {"items": self._build_rows(body.conversation_count)},
            ensure_ascii=False,
        ).encode("utf-8")
        started_at = perf_counter()
        response = await JobManager().upload_data(
            session,
            file_name="system14_performance_validation.json",
            file_bytes=file_bytes,
            data_type="chat",
            source=self.SOURCE,
            metadata_raw=json.dumps(
                {"purpose": "performance_validation"},
                ensure_ascii=False,
            ),
            analysis_mode="rules",
        )
        elapsed_seconds = max(perf_counter() - started_at, 0.000001)

        repo = InsightRepository(session)
        processed_conversations, processed_utterances = await repo.count_job_records(
            job_id=response.job_id,
        )
        job = await repo.get_job(response.job_id)
        target_met = (
            response.status == "completed"
            and processed_conversations == body.conversation_count
            and elapsed_seconds <= body.target_seconds
        )
        completed_at = datetime.utcnow()
        row = await repo.create_performance_run(
            job_id=response.job_id,
            requested_conversations=body.conversation_count,
            processed_conversations=processed_conversations,
            processed_utterances=processed_utterances,
            target_seconds=body.target_seconds,
            elapsed_seconds=elapsed_seconds,
            conversations_per_second=processed_conversations / elapsed_seconds,
            status=response.status,
            target_met=target_met,
            error_message=job.error_message,
            completed_at=completed_at,
        )
        await session.commit()
        return PerformanceRunResponse.model_validate(row)

    async def list_runs(
        self,
        session: AsyncSession,
        *,
        limit: int,
    ) -> PerformanceRunListResponse:
        rows = await InsightRepository(session).list_performance_runs(limit=limit)
        return PerformanceRunListResponse(
            runs=[PerformanceRunResponse.model_validate(row) for row in rows]
        )

    @staticmethod
    def _build_rows(conversation_count: int) -> list[dict]:
        rows: list[dict] = []
        for index in range(1, conversation_count + 1):
            rows.append(
                {
                    "speaker": "customer" if index % 2 else "staff",
                    "text": f"商品Aに関する一般的な問い合わせです。受付番号は{index}です。",
                    "product": "商品A",
                    "staff_id": f"performance_staff_{(index - 1) % 10 + 1:02d}",
                    "call_reason": "性能検証",
                    "outcome": "win" if index % 2 else "loss",
                }
            )
        return rows
