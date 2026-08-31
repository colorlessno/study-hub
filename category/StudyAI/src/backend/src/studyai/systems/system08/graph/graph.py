from __future__ import annotations

from importlib import import_module
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.agent_graph.base_state import create_base_state
from studyai.common.agent_graph.builders import compile_graph, create_state_graph
from studyai.common.agent_graph.runner import GraphRunner
from studyai.systems.system08.graph.nodes import System08GraphNodes
from studyai.systems.system08.graph.state import System08GraphState
from studyai.systems.system08.repositories.analysis_repository import AnalysisRepository
from studyai.systems.system08.schemas.analysis import AnalysisCreateRequest


class AnalysisGraphOrchestrator:
    def __init__(self, *, nodes: System08GraphNodes | None = None) -> None:
        self.nodes = nodes or System08GraphNodes()
        self.runner = GraphRunner(graph_name="system08_analysis")

    async def run(
        self,
        session: AsyncSession,
        *,
        body: AnalysisCreateRequest,
        trace_id: str,
        user_id: str | None,
    ) -> dict[str, Any]:
        compiled_graph = self._build_compiled_graph(session).with_config({"recursion_limit": 64})
        initial_state = create_base_state(
            trace_id=trace_id,
            user_id=user_id,
            status="running",
            updates={"request": body},
        )
        result = await self.runner.ainvoke(compiled_graph, initial_state)
        return result.state

    def _build_compiled_graph(self, session: AsyncSession):
        graph_module = import_module("langgraph.graph")
        start = getattr(graph_module, "START")
        end = getattr(graph_module, "END")
        repository = AnalysisRepository(session)

        async def persist_analysis_node(state: dict[str, Any]) -> dict[str, Any]:
            return await self.nodes.persist_analysis(state, repository=repository)

        graph = create_state_graph(System08GraphState)
        graph.add_node("validate_input", self.nodes.validate_input)
        graph.add_node("plan_queries", self.nodes.plan_queries)
        graph.add_node("search_once", self.nodes.search_once)
        graph.add_node("fetch_sources", self.nodes.fetch_sources)
        graph.add_node("filter_sources", self.nodes.filter_sources)
        graph.add_node("judge_continue", self.nodes.judge_continue)
        graph.add_node("generate_tasks", self.nodes.generate_tasks)
        graph.add_node("score_tasks", self.nodes.score_tasks)
        graph.add_node("build_export", self.nodes.build_export)
        graph.add_node("persist_analysis", persist_analysis_node)

        graph.add_edge(start, "validate_input")
        graph.add_edge("validate_input", "plan_queries")
        graph.add_edge("plan_queries", "search_once")
        graph.add_edge("search_once", "fetch_sources")
        graph.add_edge("fetch_sources", "filter_sources")
        graph.add_edge("filter_sources", "judge_continue")
        graph.add_conditional_edges(
            "judge_continue",
            self.nodes.route_after_judge,
            {"search_once": "search_once", "generate_tasks": "generate_tasks"},
        )
        graph.add_edge("generate_tasks", "score_tasks")
        graph.add_edge("score_tasks", "build_export")
        graph.add_edge("build_export", "persist_analysis")
        graph.add_edge("persist_analysis", end)
        return compile_graph(graph)
