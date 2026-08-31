from __future__ import annotations

from typing import Any

from studyai.common.agent_graph.base_state import GraphBaseState
from studyai.systems.system08.schemas.analysis import AnalysisCreateRequest


class System08GraphState(GraphBaseState, total=False):
    request: AnalysisCreateRequest
    queries: list[str]
    current_query_index: int
    current_query: str
    current_search_results: list[dict[str, Any]]
    raw_sources: list[dict[str, Any]]
    accepted_sources: list[dict[str, Any]]
    search_count: int
    search_queries: list[str]
    generated_payload: dict[str, Any]
    summary: str
    scored_tasks: list[dict[str, Any]]
    priority_summary: dict[str, Any]
    markdown: str
    next_step: str
    persisted_analysis: Any
