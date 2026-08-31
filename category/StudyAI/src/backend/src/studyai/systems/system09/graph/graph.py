from __future__ import annotations

from importlib import import_module
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.agent_graph.base_state import create_base_state
from studyai.common.agent_graph.builders import compile_graph, create_state_graph
from studyai.common.agent_graph.runner import GraphRunner
from studyai.systems.system09.graph.nodes import System09GraphNodes
from studyai.systems.system09.graph.state import System09GraphState
from studyai.systems.system09.repositories.report_repository import ReportRepository
from studyai.systems.system09.schemas.research import ResearchRequest


class ResearchGraphOrchestrator:
    def __init__(self, *, nodes: System09GraphNodes | None = None) -> None:
        self.nodes = nodes or System09GraphNodes()
        self.runner = GraphRunner(graph_name="system09_research")

    async def run(
        self,
        session: AsyncSession,
        *,
        body: ResearchRequest,
        trace_id: str,
        user_id: str | None,
    ) -> dict[str, Any]:
        compiled_graph = self._build_compiled_graph(session)
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
        repository = ReportRepository(session)

        async def persist_report_node(state: dict[str, Any]) -> dict[str, Any]:
            return await self.nodes.persist_report(state, repository=repository)

        graph = create_state_graph(System09GraphState)
        graph.add_node("validate_request", self.nodes.validate_request)
        graph.add_node("plan_research", self.nodes.plan_research)
        graph.add_node("collect_sources", self.nodes.collect_sources)
        graph.add_node("compose_report", self.nodes.compose_report)
        graph.add_node("persist_report", persist_report_node)
        graph.add_edge(start, "validate_request")
        graph.add_edge("validate_request", "plan_research")
        graph.add_edge("plan_research", "collect_sources")
        graph.add_edge("collect_sources", "compose_report")
        graph.add_edge("compose_report", "persist_report")
        graph.add_edge("persist_report", end)
        return compile_graph(graph)
