from __future__ import annotations

import asyncio
from types import SimpleNamespace

from studyai.common.agent_graph.base_state import create_base_state
from studyai.common.agent_graph.builders import compile_graph, create_state_graph
from studyai.common.agent_graph.errors import GraphFatalError, GraphRetryableError, GraphStop
from studyai.common.agent_graph.policies import LoopPolicy, RetryPolicy
from studyai.common.agent_graph.runner import GraphRunner
from studyai.common.agent_graph.tracing import (
    record_graph_error,
    record_step_failure,
    record_step_start,
    record_step_success,
)


def test_create_base_state_builds_required_fields():
    state = create_base_state(trace_id="trace-01", user_id="user-01", updates={"foo": "bar"})

    assert state["trace_id"] == "trace-01"
    assert state["user_id"] == "user-01"
    assert state["status"] == "created"
    assert state["errors"] == []
    assert state["step_logs"] == []
    assert state["foo"] == "bar"


def test_tracing_records_step_success_and_error():
    state = create_base_state(trace_id="trace-01", user_id=None)

    handle = record_step_start(state, step_name="search", metadata={"query": "abc"})
    record_step_success(state, handle=handle, next_step="persist", metadata={"count": 3})
    record_graph_error(state, error_code="warning", error_message="fallback used")

    assert state["step_logs"][0]["step_name"] == "search"
    assert state["step_logs"][0]["status"] == "completed"
    assert state["step_logs"][0]["next_step"] == "persist"
    assert state["step_logs"][0]["metadata"]["count"] == 3
    assert state["errors"][0]["error_code"] == "warning"


def test_tracing_records_failure():
    state = create_base_state(trace_id="trace-01", user_id=None)

    handle = record_step_start(state, step_name="fetch")
    record_step_failure(state, handle=handle, error_code="fetch_failed", error_message="timeout")

    assert state["step_logs"][0]["status"] == "failed"
    assert state["step_logs"][0]["error_code"] == "fetch_failed"


def test_loop_and_retry_policies():
    loop_policy = LoopPolicy(max_iterations=3)
    retry_policy = RetryPolicy(max_attempts=2)

    assert loop_policy.should_continue(iteration=0, made_progress=True) is True
    assert loop_policy.should_continue(iteration=3, made_progress=True) is False
    assert retry_policy.should_retry(attempt=1, error=GraphRetryableError("retry", "again")) is True
    assert retry_policy.should_retry(attempt=2, error=GraphRetryableError("retry", "again")) is False
    assert retry_policy.should_retry(attempt=1, error=GraphStop("stop")) is False


def test_graph_runner_supports_ainvoke():
    class FakeCompiledGraph:
        async def ainvoke(self, state):
            return {"status": "completed", "result": state["value"] + 1}

    runner = GraphRunner(graph_name="system08")
    result = asyncio.run(
        runner.ainvoke(FakeCompiledGraph(), {"trace_id": "t1", "user_id": "u1", "value": 1})
    )

    assert result.status == "completed"
    assert result.state["result"] == 2


def test_graph_runner_handles_graph_stop():
    class FakeCompiledGraph:
        async def ainvoke(self, state):
            raise GraphStop("manual stop", details={"reason": "enough_data"})

    runner = GraphRunner(graph_name="system09")
    result = asyncio.run(runner.ainvoke(FakeCompiledGraph(), {"trace_id": "t2", "user_id": "u2"}))

    assert result.status == "stopped"
    assert result.state["errors"][0]["error_code"] == "graph_stopped"


def test_builders_work_with_patched_state_graph(monkeypatch):
    class FakeStateGraph:
        def __init__(self, state_schema):
            self.state_schema = state_schema

        def compile(self):
            return SimpleNamespace(state_schema=self.state_schema)

    monkeypatch.setattr(
        "studyai.common.agent_graph.builders._load_state_graph_class",
        lambda: FakeStateGraph,
    )

    graph = create_state_graph(dict)
    compiled = compile_graph(graph)

    assert graph.state_schema is dict
    assert compiled.state_schema is dict


def test_compile_graph_rejects_invalid_graph():
    try:
        compile_graph(object())
    except GraphFatalError as exc:
        assert exc.error_code == "invalid_graph"
    else:
        raise AssertionError("GraphFatalError was not raised")
