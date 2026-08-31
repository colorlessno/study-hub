from __future__ import annotations

from typing import Any

from studyai.common.agent_graph.base_state import GraphBaseState
from studyai.systems.system09.schemas.research import ResearchRequest


class System09GraphState(GraphBaseState, total=False):
    request: ResearchRequest
    plan: list[dict[str, Any]]
    queries: list[str]
    query_log: list[dict[str, Any]]
    raw_sources: list[dict[str, Any]]
    accepted_sources: list[dict[str, Any]]
    search_count: int
    report_payload: dict[str, Any]
    persisted_report: Any
