from __future__ import annotations

from importlib import import_module
from typing import Any

from studyai.common.agent_graph.errors import GraphFatalError


def _load_state_graph_class():
    try:
        module = import_module("langgraph.graph")
    except ImportError as exc:
        raise GraphFatalError(
            "langgraph_not_installed",
            "langgraph is not installed. Install project dependencies before using graph builders.",
        ) from exc
    return getattr(module, "StateGraph")


def create_state_graph(state_schema: Any):
    state_graph_class = _load_state_graph_class()
    return state_graph_class(state_schema)


def compile_graph(graph):
    if not hasattr(graph, "compile"):
        raise GraphFatalError("invalid_graph", "graph must expose compile().")
    return graph.compile()
