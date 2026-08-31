from __future__ import annotations

from importlib import import_module
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.agent_graph.base_state import create_base_state
from studyai.common.agent_graph.builders import compile_graph, create_state_graph
from studyai.common.agent_graph.runner import GraphRunner
from studyai.systems.system12.graph.nodes import System12GraphNodes
from studyai.systems.system12.graph.state import System12GraphState
from studyai.systems.system12.schemas.gift import ChatRequest


class ChatGraphOrchestrator:
    def __init__(self, *, nodes: System12GraphNodes | None = None) -> None:
        self.nodes = nodes or System12GraphNodes()
        self.runner = GraphRunner(graph_name="system12_chat")

    async def run(
        self,
        session: AsyncSession,
        *,
        body: ChatRequest,
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

        async def load_session_node(state: dict[str, Any]) -> dict[str, Any]:
            return await self.nodes.load_session(state, session=session)

        async def store_user_message_node(state: dict[str, Any]) -> dict[str, Any]:
            return await self.nodes.store_user_message(state, session=session)

        async def merge_conditions_node(state: dict[str, Any]) -> dict[str, Any]:
            return await self.nodes.merge_conditions(state, session=session)

        async def search_candidates_node(state: dict[str, Any]) -> dict[str, Any]:
            return await self.nodes.search_candidates(state, session=session)

        async def apply_rules_node(state: dict[str, Any]) -> dict[str, Any]:
            return await self.nodes.apply_rules(state, session=session)

        async def persist_response_node(state: dict[str, Any]) -> dict[str, Any]:
            return await self.nodes.persist_response(state, session=session)

        graph = create_state_graph(System12GraphState)
        graph.add_node("load_session", load_session_node)
        graph.add_node("store_user_message", store_user_message_node)
        graph.add_node("extract_conditions", self.nodes.extract_conditions)
        graph.add_node("merge_conditions", merge_conditions_node)
        graph.add_node("judge_missing_conditions", self.nodes.judge_missing_conditions)
        graph.add_node("search_candidates", search_candidates_node)
        graph.add_node("apply_rules", apply_rules_node)
        graph.add_node("build_recommendations", self.nodes.build_recommendations)
        graph.add_node("judge_recommendations", self.nodes.judge_recommendations)
        graph.add_node("build_followup_response", self.nodes.build_followup_response)
        graph.add_node("build_recommendation_response", self.nodes.build_recommendation_response)
        graph.add_node("persist_response", persist_response_node)

        graph.add_edge(start, "load_session")
        graph.add_edge("load_session", "store_user_message")
        graph.add_edge("store_user_message", "extract_conditions")
        graph.add_edge("extract_conditions", "merge_conditions")
        graph.add_edge("merge_conditions", "judge_missing_conditions")
        graph.add_conditional_edges(
            "judge_missing_conditions",
            self.nodes.route_after_missing,
            {
                "search_candidates": "search_candidates",
                "build_followup_response": "build_followup_response",
            },
        )
        graph.add_edge("search_candidates", "apply_rules")
        graph.add_edge("apply_rules", "build_recommendations")
        graph.add_edge("build_recommendations", "judge_recommendations")
        graph.add_conditional_edges(
            "judge_recommendations",
            self.nodes.route_after_recommendations,
            {
                "build_followup_response": "build_followup_response",
                "build_recommendation_response": "build_recommendation_response",
            },
        )
        graph.add_edge("build_followup_response", "persist_response")
        graph.add_edge("build_recommendation_response", "persist_response")
        graph.add_edge("persist_response", end)
        return compile_graph(graph)
