from __future__ import annotations

import asyncio
from types import SimpleNamespace

from studyai.systems.system08.graph.nodes import System08GraphNodes
from studyai.systems.system08.schemas.analysis import AnalysisCreateRequest


class _FakeQueryPlanner:
    async def plan_queries(self, body: AnalysisCreateRequest) -> list[str]:
        return [f"{body.theme} 調査"]


class _FakeSearchTool:
    async def search(self, query: str, *, max_results: int = 4) -> list[dict]:
        return [{"title": "A", "url": "https://example.com/a", "snippet": "snippet", "source_type": "search"}]


class _FakeFetchTool:
    async def fetch(self, url: str) -> dict:
        return {"url": url, "title": "Fetched", "content": "A" * 120, "source_type": "web", "domain": "example.com"}


class _SlowFetchTool:
    async def fetch(self, url: str) -> dict:
        await asyncio.sleep(0.05)
        return {"url": url, "title": "Slow", "content": "B" * 120, "source_type": "web", "domain": "example.com"}


class _FakeTaskGenerator:
    async def generate_tasks(self, body: AnalysisCreateRequest, *, sources: list[dict]) -> dict:
        return {
            "summary": "summary",
            "tasks": [
                {
                    "task_no": 1,
                    "name": "task-1",
                    "description": "desc",
                    "urgency": "high",
                    "importance": "high",
                    "estimated_hours": 2.0,
                    "references": [{"title": "ref", "url": "https://example.com/a"}],
                    "evidence": [{"title": "ref", "url": "https://example.com/a"}],
                    "status": "todo",
                }
            ],
        }


class _FakeRepository:
    async def create_analysis(self, **kwargs):
        return SimpleNamespace(id=11, theme=kwargs["theme"])

    async def replace_tasks(self, analysis_id: int, tasks: list[dict]):
        return SimpleNamespace(id=analysis_id, theme="theme")

    async def complete_analysis(self, analysis_id: int, **kwargs):
        return SimpleNamespace(
            id=analysis_id,
            theme="theme",
            search_count=kwargs["search_count"],
            search_queries=kwargs["search_queries"],
            sources_json=kwargs["sources_json"],
            summary=kwargs["summary"],
            priority_summary=kwargs["priority_summary"],
            markdown=kwargs["markdown"],
            total_tasks=kwargs["total_tasks"],
            total_estimated_hours=kwargs["total_estimated_hours"],
            tasks=[],
            status="completed",
        )


def test_graph_nodes_run_to_scored_tasks():
    request = AnalysisCreateRequest(theme="新規学習テーマ", depth="概要レベル", output_format="json")
    nodes = System08GraphNodes(
        query_planner=_FakeQueryPlanner(),
        search_tool=_FakeSearchTool(),
        fetch_tool=_FakeFetchTool(),
        task_generator=_FakeTaskGenerator(),
    )
    state = {"request": request, "step_logs": [], "errors": []}

    state.update(asyncio.run(nodes.plan_queries(state)))
    state.update(asyncio.run(nodes.search_once(state)))
    state.update(asyncio.run(nodes.fetch_sources(state)))
    state.update(asyncio.run(nodes.filter_sources(state)))
    state.update(asyncio.run(nodes.judge_continue(state)))
    state.update(asyncio.run(nodes.generate_tasks(state)))
    state.update(asyncio.run(nodes.score_tasks(state)))
    state.update(asyncio.run(nodes.build_export(state)))

    assert state["current_query_index"] == 1
    assert state["next_step"] == "generate_tasks"
    assert len(state["accepted_sources"]) == 1
    assert state["scored_tasks"][0]["priority"] == "high"
    assert "# 新規学習テーマ" in state["markdown"]


def test_fetch_sources_skips_a_page_that_exceeds_the_time_limit():
    nodes = System08GraphNodes(fetch_tool=_SlowFetchTool())
    nodes.FETCH_TIMEOUT_SECONDS = 0.01
    state = {
        "current_search_results": [
            {"title": "Slow", "url": "https://example.com/slow", "snippet": "snippet"},
        ],
        "raw_sources": [
            {"title": "Existing", "url": "https://example.com/existing", "content": "A" * 120},
        ],
        "step_logs": [],
        "errors": [],
    }

    result = asyncio.run(nodes.fetch_sources(state))

    assert result["raw_sources"] == state["raw_sources"]


def test_graph_nodes_persist_analysis():
    request = AnalysisCreateRequest(theme="新規学習テーマ", depth="讎りｦ√Ξ繝吶Ν", output_format="json")
    nodes = System08GraphNodes()
    state = {
        "request": request,
        "search_count": 1,
        "search_queries": ["新規学習テーマ 調査"],
        "accepted_sources": [{"title": "ref", "url": "https://example.com/a"}],
        "summary": "summary",
        "priority_summary": {"recommended_order": [1]},
        "markdown": "# 新規学習テーマ",
        "scored_tasks": [
            {
                "task_no": 1,
                "name": "task-1",
                "description": "desc",
                "priority": "high",
                "urgency": "high",
                "importance": "high",
                "status": "todo",
                "references": [],
                "evidence": [],
                "dependencies": [],
                "estimated_hours": 2.0,
            }
        ],
        "step_logs": [],
        "errors": [],
    }

    result = asyncio.run(nodes.persist_analysis(state, repository=_FakeRepository()))

    assert result["persisted_analysis"].id == 11
    assert result["persisted_analysis"].total_tasks == 1
