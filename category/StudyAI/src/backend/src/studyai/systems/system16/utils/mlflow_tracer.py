from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from studyai.common.config.settings import get_settings


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class MatchTrace:
    mode: str
    trace_id: str
    latency_ms: float
    status: str
    score: float | None = None
    parse_confidence: float | None = None
    review_required: bool | None = None
    similar_case_count: int = 0
    candidate_id: str | None = None
    bulk_id: int | None = None
    error_type: str | None = None


class MLflowTracer:
    """system16 の評価処理をローカルMLflowへ記録する。"""

    def __init__(self) -> None:
        self.settings = get_settings()

    async def record(self, trace: MatchTrace) -> None:
        try:
            self._record_sync(trace)
        except Exception:
            logger.exception("MLflow trace failed: mode=%s trace_id=%s", trace.mode, trace.trace_id)

    def _record_sync(self, trace: MatchTrace) -> None:
        import mlflow

        mlflow.set_tracking_uri(self.settings.mlflow_tracking_uri)
        mlflow.set_experiment(self.settings.system16_mlflow_experiment_name)
        with mlflow.start_run(run_name=f"system16_{trace.mode}_{trace.trace_id}"):
            mlflow.log_param("mode", trace.mode)
            metrics: dict[str, float] = {
                "latency_ms": trace.latency_ms,
                "similar_case_count": float(trace.similar_case_count),
            }
            if trace.score is not None:
                metrics["score"] = trace.score
            if trace.parse_confidence is not None:
                metrics["parse_confidence"] = trace.parse_confidence
            mlflow.log_metrics(metrics)
            tags: dict[str, Any] = {"status": trace.status, "trace_id": trace.trace_id}
            if trace.review_required is not None:
                tags["review_required"] = str(trace.review_required).lower()
            if trace.candidate_id is not None:
                tags["candidate_id"] = trace.candidate_id
            if trace.bulk_id is not None:
                tags["bulk_id"] = str(trace.bulk_id)
            if trace.error_type is not None:
                tags["error_type"] = trace.error_type
            mlflow.set_tags(tags)
