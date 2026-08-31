from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from studyai.common.config.settings import get_settings


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ExtractionTrace:
    file_name: str
    file_type: str
    model_used: str
    latency_ms: float
    status: str
    trace_id: str
    confidence_score: Decimal | None = None
    requires_review: bool | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    retry_count: int = 0
    job_id: str | None = None
    validation_failure_raw_output: str | None = None


class MLflowTracer:
    """system01 の抽出結果を設計書で定めた MLflow 実験へ記録する。"""

    PROMPT_VERSION = "v1.0"

    def __init__(self) -> None:
        self.settings = get_settings()

    async def record(self, trace: ExtractionTrace) -> None:
        try:
            await asyncio.to_thread(self._record_sync, trace)
        except Exception:
            logger.exception(
                "MLflow trace failed: file_name=%s trace_id=%s",
                trace.file_name,
                trace.trace_id,
            )

    def _record_sync(self, trace: ExtractionTrace) -> None:
        import mlflow

        mlflow.set_tracking_uri(self.settings.mlflow_tracking_uri)
        mlflow.set_experiment(self.settings.mlflow_experiment_name)
        run_name = f"{trace.file_name}_{datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ')}"
        with mlflow.start_run(run_name=run_name):
            mlflow.log_params(
                {
                    "file_type": trace.file_type,
                    "model_used": trace.model_used,
                    "prompt_version": self.PROMPT_VERSION,
                }
            )
            metrics: dict[str, float] = {
                "latency_ms": trace.latency_ms,
                "retry_count": float(trace.retry_count),
            }
            if trace.confidence_score is not None:
                metrics["confidence_score"] = float(trace.confidence_score)
            if trace.input_tokens is not None:
                metrics["input_tokens"] = float(trace.input_tokens)
            if trace.output_tokens is not None:
                metrics["output_tokens"] = float(trace.output_tokens)
            mlflow.log_metrics(metrics)
            tags: dict[str, Any] = {
                "status": trace.status,
                "trace_id": trace.trace_id,
            }
            if trace.requires_review is not None:
                tags["requires_review"] = str(trace.requires_review).lower()
            if trace.job_id is not None:
                tags["job_id"] = trace.job_id
            mlflow.set_tags(tags)
            if trace.validation_failure_raw_output is not None:
                mlflow.log_text(
                    trace.validation_failure_raw_output,
                    "validation_failure_raw_output.json",
                )
