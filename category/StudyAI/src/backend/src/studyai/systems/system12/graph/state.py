from __future__ import annotations

from typing import Any

from studyai.common.agent_graph.base_state import GraphBaseState
from studyai.systems.system12.schemas.gift import ChatRequest


class System12GraphState(GraphBaseState, total=False):
    request: ChatRequest
    stored_session: Any
    updated_session: Any
    conditions: dict[str, Any]
    missing_conditions: list[str]
    candidates: list[dict[str, Any]]
    filtered_candidates: list[dict[str, Any]]
    recommendations: list[dict[str, Any]]
    recommended_ids: list[int]
    response_type: str
    response_message: str
    next_step: str
    response_payload: dict[str, Any]
