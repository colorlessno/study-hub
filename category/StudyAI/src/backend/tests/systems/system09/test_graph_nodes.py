from __future__ import annotations

import asyncio

from studyai.systems.system09.graph.nodes import System09GraphNodes
from studyai.systems.system09.schemas.research import ResearchRequest
from studyai.systems.system09.services.query_generator import QueryGenerator
from studyai.systems.system09.services.report_composer import ReportComposer
from studyai.systems.system09.services.research_planner import ResearchPlanner


class _FakePlanner:
    async def build_research_plan(self, request: ResearchRequest):
        return [{"topic": request.research_type, "priority": 1}]


class _FakeQueryGenerator:
    async def generate_queries(self, request: ResearchRequest, plan: list[dict]):
        return [f"{request.targets[0]} 料金"]


class _FakeSearchTool:
    async def search(self, query: str, *, max_results: int = 5):
        return [{"title": "A", "url": "https://example.com/a", "snippet": "snippet", "source_type": "search"}]


class _EmptySearchTool:
    async def search(self, query: str, *, max_results: int = 5):
        return []


class _FakeFetchTool:
    async def fetch(self, url: str):
        return {"url": url, "title": "Fetched", "content": "A" * 120, "source_type": "web", "domain": "example.com"}


class _SlowAndFastFetchTool:
    async def fetch(self, url: str):
        if url.endswith("slow"):
            await asyncio.sleep(0.1)
        return {"url": url, "title": "Fetched", "content": "A" * 120, "source_type": "web", "domain": "example.com"}


class _TwoResultSearchTool:
    async def search(self, query: str, *, max_results: int = 5):
        return [
            {"title": "Slow", "url": "https://example.com/slow", "snippet": "slow", "source_type": "search"},
            {"title": "Fast", "url": "https://example.com/fast", "snippet": "fast", "source_type": "search"},
        ]


class _SlowLlmClient:
    async def extract_json(self, system_prompt: str, user_prompt: str):
        await asyncio.sleep(0.1)
        return {}


class _FakeComposer:
    async def compose_report(self, request: ResearchRequest, sources: list[dict]):
        return {
            "executive_summary": "summary",
            "key_findings": ["finding"],
            "companies": [],
            "comparison_table": {"headers": [], "rows": []},
            "swot": {"strengths": [], "weaknesses": [], "opportunities": [], "threats": []},
            "trends": "trends",
            "limitations": "limitations",
        }


def test_graph_nodes_plan_and_collect_sources():
    request = ResearchRequest(research_type="競合調査", targets=["株式会社A"])
    nodes = System09GraphNodes(
        planner=_FakePlanner(),
        query_generator=_FakeQueryGenerator(),
        search_tool=_FakeSearchTool(),
        fetch_tool=_FakeFetchTool(),
        report_composer=_FakeComposer(),
    )
    state = {"request": request, "step_logs": [], "errors": []}

    planned = asyncio.run(nodes.plan_research(state))
    state.update(planned)
    collected = asyncio.run(nodes.collect_sources(state))

    assert planned["queries"] == ["株式会社A 料金"]
    assert collected["search_count"] == 1
    assert len(collected["accepted_sources"]) == 1


def test_graph_nodes_compose_report():
    request = ResearchRequest(research_type="競合調査", targets=["株式会社A"])
    nodes = System09GraphNodes(report_composer=_FakeComposer())
    state = {"request": request, "accepted_sources": [{"url": "https://example.com"}], "step_logs": [], "errors": []}

    composed = asyncio.run(nodes.compose_report(state))

    assert composed["report_payload"]["executive_summary"] == "summary"


def test_collect_sources_skips_fetch_that_exceeds_timeout():
    request = ResearchRequest(research_type="競合調査", targets=["株式会社A"])
    nodes = System09GraphNodes(
        search_tool=_TwoResultSearchTool(),
        fetch_tool=_SlowAndFastFetchTool(),
    )
    nodes.FETCH_TIMEOUT_SECONDS = 0.01
    state = {
        "request": request,
        "queries": ["株式会社A 料金"],
        "raw_sources": [],
        "query_log": [],
        "search_count": 0,
        "step_logs": [],
        "errors": [],
    }

    collected = asyncio.run(nodes.collect_sources(state))

    assert collected["search_count"] == 1
    assert [source["url"] for source in collected["accepted_sources"]] == ["https://example.com/fast"]


def test_collect_sources_keeps_input_conditions_when_public_sources_are_unavailable():
    request = ResearchRequest(
        research_type="競合調査",
        targets=["株式会社A"],
        purpose="導入候補を比較する",
        focus_areas=["料金"],
    )
    nodes = System09GraphNodes(search_tool=_EmptySearchTool())
    state = {
        "request": request,
        "queries": ["株式会社A 料金"],
        "raw_sources": [],
        "query_log": [],
        "search_count": 0,
        "step_logs": [],
        "errors": [],
    }

    collected = asyncio.run(nodes.collect_sources(state))
    report = asyncio.run(ReportComposer().compose_report(request, collected["accepted_sources"]))

    assert collected["accepted_sources"][0]["source_type"] == "request"
    assert report["companies"][0]["name"] == "株式会社A"
    assert report["companies"][0]["sources"] == ["local://research-input/1"]
    assert report["swot"]["weaknesses"] == ["公開情報を取得できていない"]
    assert report["limitations"].startswith("外部の公開情報を含まない")


def test_report_theme_uses_research_purpose():
    request = ResearchRequest(
        research_type="競合調査",
        targets=["株式会社A", "株式会社B"],
        purpose="導入候補を比較する",
    )

    assert System09GraphNodes._build_theme(request) == "導入候補を比較する"


def test_ai_services_return_learning_fallbacks_after_timeout():
    request = ResearchRequest(
        research_type="競合調査",
        targets=["株式会社A"],
        focus_areas=["料金"],
    )
    planner = ResearchPlanner()
    planner.llm_client = _SlowLlmClient()
    planner.MODEL_TIMEOUT_SECONDS = 0.01
    query_generator = QueryGenerator()
    query_generator.llm_client = _SlowLlmClient()
    query_generator.MODEL_TIMEOUT_SECONDS = 0.01
    composer = ReportComposer()
    composer.llm_client = _SlowLlmClient()
    composer.MODEL_TIMEOUT_SECONDS = 0.01

    plan = asyncio.run(planner.build_research_plan(request))
    queries = asyncio.run(query_generator.generate_queries(request, plan))
    report = asyncio.run(
        composer.compose_report(
            request,
            [{"title": "公開情報", "url": "https://example.com/source"}],
        )
    )

    assert plan[0]["topic"] == "料金"
    assert "株式会社A 最新ニュース" in queries
    assert report["companies"][0]["name"] == "株式会社A"
    assert report["limitations"].startswith("AIによる構造化が完了していない")
