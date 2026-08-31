from __future__ import annotations

from typing import Any, Mapping, TypedDict


class GraphStepLog(TypedDict, total=False):
    step_name: str
    status: str
    started_at: str
    finished_at: str | None
    duration_ms: int | None
    next_step: str | None
    metadata: dict[str, Any]
    error_code: str | None
    error_message: str | None


class GraphBaseState(TypedDict, total=False):
    trace_id: str
    user_id: str | None
    status: str
    errors: list[dict[str, Any]]
    step_logs: list[GraphStepLog]


def create_base_state(
    *,
    trace_id: str,
    user_id: str | None,
    status: str = "created",
    updates: Mapping[str, Any] | None = None,
) -> GraphBaseState:
    state: GraphBaseState = {
        "trace_id": trace_id,
        "user_id": user_id,
        "status": status,
        "errors": [],
        "step_logs": [],
    }
    if updates:
        state.update(dict(updates))
    return state
