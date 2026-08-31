from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from studyai.common.config.settings import get_settings


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ReviewTrace:
    operation: str
    model_used: str
    latency_ms: float
    status: str
    trace_id: str
    chunk_count: int
    issue_count: int
    input_tokens: int | None = None
    output_tokens: int | None = None
    retry_count: int = 0
    error_code: str | None = None


class MLflowTracer:
    """system02の審査結果を、原文を含めずローカルMLflowへ記録する。"""

    PROMPT_VERSION = "v1.0"

    def __init__(self) -> None:
        self.settings = get_settings()

    async def record(self, trace: ReviewTrace) -> None:
        try:
            self._record_sync(trace)
        except Exception:
            logger.exception(
                "MLflow trace failed: operation=%s trace_id=%s",
                trace.operation,
                trace.trace_id,
            )

    def _record_sync(self, trace: ReviewTrace) -> None:
        import mlflow

        mlflow.set_tracking_uri(self.settings.mlflow_tracking_uri)
        mlflow.set_experiment(self.settings.system02_mlflow_experiment_name)
        with mlflow.start_run(run_name=f"system02_{trace.operation}_{trace.trace_id}"):
            mlflow.log_params(
                {
                    "operation": trace.operation,
                    "model_used": trace.model_used,
                    "prompt_version": self.PROMPT_VERSION,
                }
            )
            metrics: dict[str, float] = {
                "latency_ms": trace.latency_ms,
                "chunk_count": float(trace.chunk_count),
                "issue_count": float(trace.issue_count),
                "retry_count": float(trace.retry_count),
            }
            if trace.input_tokens is not None:
                metrics["input_tokens"] = float(trace.input_tokens)
            if trace.output_tokens is not None:
                metrics["output_tokens"] = float(trace.output_tokens)
            mlflow.log_metrics(metrics)
            tags: dict[str, Any] = {
                "status": trace.status,
                "trace_id": trace.trace_id,
            }
            if trace.error_code is not None:
                tags["error_code"] = trace.error_code
            mlflow.set_tags(tags)
