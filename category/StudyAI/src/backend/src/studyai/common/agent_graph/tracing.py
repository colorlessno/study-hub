from __future__ import annotations

from datetime import datetime, timezone
from time import perf_counter
from typing import Any


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_lists(state: dict[str, Any]) -> None:
    state.setdefault("step_logs", [])
    state.setdefault("errors", [])


def record_step_start(
    state: dict[str, Any],
    *,
    step_name: str,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    _ensure_lists(state)
    handle = {
        "index": len(state["step_logs"]),
        "started_monotonic": perf_counter(),
    }
    state["step_logs"].append(
        {
            "step_name": step_name,
            "status": "running",
            "started_at": _utcnow_iso(),
            "finished_at": None,
            "duration_ms": None,
            "next_step": None,
            "metadata": metadata or {},
            "error_code": None,
            "error_message": None,
        }
    )
    return handle


def record_step_success(
    state: dict[str, Any],
    *,
    handle: dict[str, Any],
    next_step: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    _ensure_lists(state)
    log = state["step_logs"][handle["index"]]
    log["status"] = "completed"
    log["finished_at"] = _utcnow_iso()
    log["duration_ms"] = int((perf_counter() - handle["started_monotonic"]) * 1000)
    log["next_step"] = next_step
    if metadata:
        merged = dict(log.get("metadata") or {})
        merged.update(metadata)
        log["metadata"] = merged


def record_step_failure(
    state: dict[str, Any],
    *,
    handle: dict[str, Any],
    error_code: str,
    error_message: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    _ensure_lists(state)
    log = state["step_logs"][handle["index"]]
    log["status"] = "failed"
    log["finished_at"] = _utcnow_iso()
    log["duration_ms"] = int((perf_counter() - handle["started_monotonic"]) * 1000)
    log["error_code"] = error_code
    log["error_message"] = error_message
    if metadata:
        merged = dict(log.get("metadata") or {})
        merged.update(metadata)
        log["metadata"] = merged


def record_graph_error(
    state: dict[str, Any],
    *,
    error_code: str,
    error_message: str,
    details: dict[str, Any] | None = None,
) -> None:
    _ensure_lists(state)
    state["errors"].append(
        {
            "error_code": error_code,
            "error_message": error_message,
            "details": details or {},
            "occurred_at": _utcnow_iso(),
        }
    )
