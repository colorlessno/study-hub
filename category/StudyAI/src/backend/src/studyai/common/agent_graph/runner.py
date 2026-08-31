from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from studyai.common.agent_graph.base_state import create_base_state
from studyai.common.agent_graph.errors import GraphFatalError, GraphStop
from studyai.common.agent_graph.tracing import record_graph_error
from studyai.common.agent_graph.types import GraphExecutionResult


class GraphRunner:
    def __init__(self, *, graph_name: str) -> None:
        self.graph_name = graph_name

    async def ainvoke(self, compiled_graph: Any, initial_state: Mapping[str, Any]) -> GraphExecutionResult:
        state = dict(initial_state)
        state.setdefault("status", "running")
        if "trace_id" not in state:
            state.update(create_base_state(trace_id=f"{self.graph_name}-trace", user_id=None, updates=state))
        try:
            if hasattr(compiled_graph, "ainvoke"):
                result = await compiled_graph.ainvoke(state)
            elif hasattr(compiled_graph, "invoke"):
                result = compiled_graph.invoke(state)
            else:
                raise GraphFatalError("invalid_compiled_graph", "compiled_graph must expose invoke() or ainvoke().")
        except GraphStop as exc:
            record_graph_error(
                state,
                error_code="graph_stopped",
                error_message=exc.message,
                details=exc.details,
            )
            state["status"] = "stopped"
            return GraphExecutionResult(state=state, status="stopped", graph_name=self.graph_name)
        if isinstance(result, Mapping):
            state.update(dict(result))
        if state.get("status") == "running":
            state["status"] = "completed"
        return GraphExecutionResult(
            state=state,
            status=str(state.get("status") or "completed"),
            graph_name=self.graph_name,
        )
