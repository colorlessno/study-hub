from __future__ import annotations

import asyncio
from typing import Any

from studyai.common.agent_graph.tracing import record_step_failure, record_step_start, record_step_success
from studyai.common.errors.models import ValidationAppError
from studyai.systems.system09.repositories.report_repository import ReportRepository
from studyai.systems.system09.schemas.research import ResearchRequest
from studyai.systems.system09.services.query_generator import QueryGenerator
from studyai.systems.system09.services.report_composer import ReportComposer
from studyai.systems.system09.services.research_planner import ResearchPlanner
from studyai.common.search.source_evaluator import SourceEvaluator
from studyai.common.search.web_fetch_tool import WebFetchTool
from studyai.common.search.web_search_tool import WebSearchTool


class System09GraphNodes:
    VALID_RESEARCH_TYPES = {"競合調査", "市場調査", "業界調査", "企業調査"}
    VALID_DEPTHS = {"overview", "standard", "detailed", "概要", "標準", "詳細"}
    SOURCE_LIMITS = {"overview": 4, "概要": 4, "standard": 6, "標準": 6, "detailed": 8, "詳細": 8}
    SEARCH_TIMEOUT_SECONDS = 15.0
    FETCH_TIMEOUT_SECONDS = 10.0

    def __init__(
        self,
        *,
        planner: ResearchPlanner | None = None,
        query_generator: QueryGenerator | None = None,
        search_tool: WebSearchTool | None = None,
        fetch_tool: WebFetchTool | None = None,
        source_evaluator: SourceEvaluator | None = None,
        report_composer: ReportComposer | None = None,
    ) -> None:
        self.planner = planner or ResearchPlanner()
        self.query_generator = query_generator or QueryGenerator()
        self.search_tool = search_tool or WebSearchTool()
        self.fetch_tool = fetch_tool or WebFetchTool()
        self.source_evaluator = source_evaluator or SourceEvaluator()
        self.report_composer = report_composer or ReportComposer()

    async def validate_request(self, state: dict[str, Any]) -> dict[str, Any]:
        handle = record_step_start(state, step_name="validate_request")
        try:
            request = self._request_from_state(state)
            self._validate_request(request)
            record_step_success(state, handle=handle, next_step="plan_research")
            return {}
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="validate_request_failed", error_message=str(exc))
            raise

    async def plan_research(self, state: dict[str, Any]) -> dict[str, Any]:
        handle = record_step_start(state, step_name="plan_research")
        try:
            request = self._request_from_state(state)
            plan = await self.planner.build_research_plan(request)
            queries = await self.query_generator.generate_queries(request, plan)
            record_step_success(
                state,
                handle=handle,
                next_step="collect_sources",
                metadata={"query_count": len(queries)},
            )
            return {
                "plan": plan,
                "queries": queries,
                "query_log": [],
                "raw_sources": [],
                "accepted_sources": [],
                "search_count": 0,
            }
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="plan_research_failed", error_message=str(exc))
            raise

    async def collect_sources(self, state: dict[str, Any]) -> dict[str, Any]:
        handle = record_step_start(state, step_name="collect_sources")
        try:
            request = self._request_from_state(state)
            queries = [str(item).strip() for item in state.get("queries", []) if str(item).strip()]
            raw_sources: list[dict[str, Any]] = list(state.get("raw_sources", []))
            query_log: list[dict[str, Any]] = list(state.get("query_log", []))
            search_count = int(state.get("search_count", 0))
            max_sources = self.SOURCE_LIMITS.get(request.depth, 6)
            accepted_sources: list[dict[str, Any]] = []

            for query in queries[:20]:
                search_count += 1
                try:
                    search_results = await asyncio.wait_for(
                        self.search_tool.search(query, max_results=4),
                        timeout=self.SEARCH_TIMEOUT_SECONDS,
                    )
                except Exception:
                    query_log.append({"query": query, "results": 0, "error": "検索が制限時間内に完了しませんでした。"})
                    continue
                query_log.append({"query": query, "results": len(search_results)})
                fetched_sources = []
                for result in search_results:
                    fetched_sources.append(await self._fetch_source(result))
                raw_sources.extend(source for source in fetched_sources if source is not None)
                accepted_sources = self.source_evaluator.filter_sources(raw_sources, max_sources=max_sources)
                if len(accepted_sources) >= max_sources:
                    break

            if not accepted_sources:
                accepted_sources = [
                    {
                        "title": f"{target}（入力された調査対象）",
                        "url": f"local://research-input/{index}",
                        "content": (
                            f"調査対象: {target}\n"
                            f"調査目的: {request.purpose or '未指定'}\n"
                            f"重点項目: {', '.join(request.focus_areas) or '未指定'}\n"
                            "外部の公開情報は取得できませんでした。"
                        ),
                        "source_type": "request",
                        "domain": "local",
                    }
                    for index, target in enumerate(request.targets, start=1)
                ]

            record_step_success(
                state,
                handle=handle,
                next_step="compose_report",
                metadata={"accepted_sources": len(accepted_sources), "search_count": search_count},
            )
            return {
                "raw_sources": raw_sources,
                "accepted_sources": accepted_sources,
                "query_log": query_log,
                "search_count": search_count,
            }
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="collect_sources_failed", error_message=str(exc))
            raise

    async def _fetch_source(self, result: dict[str, Any]) -> dict[str, Any] | None:
        try:
            fetched = await asyncio.wait_for(
                self.fetch_tool.fetch(result["url"]),
                timeout=self.FETCH_TIMEOUT_SECONDS,
            )
            return {**result, **fetched}
        except Exception:
            return None

    async def compose_report(self, state: dict[str, Any]) -> dict[str, Any]:
        handle = record_step_start(state, step_name="compose_report")
        try:
            request = self._request_from_state(state)
            accepted_sources = list(state.get("accepted_sources", []))
            report_payload = await self.report_composer.compose_report(request, accepted_sources)
            record_step_success(state, handle=handle, next_step="persist_report")
            return {"report_payload": report_payload}
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="compose_report_failed", error_message=str(exc))
            raise

    async def persist_report(self, state: dict[str, Any], *, repository: ReportRepository) -> dict[str, Any]:
        handle = record_step_start(state, step_name="persist_report")
        try:
            request = self._request_from_state(state)
            report_payload = dict(state.get("report_payload") or {})
            report = await repository.create_report(
                research_type=request.research_type,
                theme=self._build_theme(request),
                targets=request.targets,
                purpose=request.purpose,
                own_company=request.own_company.model_dump() if request.own_company else {},
                depth=request.depth,
                focus_areas=request.focus_areas,
                search_count=int(state.get("search_count", 0)),
                executive_summary=report_payload["executive_summary"],
                key_findings=report_payload["key_findings"],
                companies=report_payload["companies"],
                comparison_table=report_payload["comparison_table"],
                swot=report_payload["swot"],
                trends=report_payload["trends"],
                limitations=report_payload["limitations"],
                markdown=None,
                sources_json=state.get("accepted_sources", []),
                query_log_json=state.get("query_log", []),
                target_normalized_key=repository.build_target_normalized_key(request.targets),
            )
            record_step_success(state, handle=handle, next_step="end", metadata={"report_id": report.id})
            return {"persisted_report": report}
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="persist_report_failed", error_message=str(exc))
            raise

    @staticmethod
    def _request_from_state(state: dict[str, Any]) -> ResearchRequest:
        request = state.get("request")
        if not isinstance(request, ResearchRequest):
            raise ValidationAppError("missing_request", "Research request was not found in graph state.")
        return request

    def _validate_request(self, body: ResearchRequest) -> None:
        if body.research_type not in self.VALID_RESEARCH_TYPES:
            raise ValidationAppError("invalid_research_type", "research_type is not supported.")
        if not body.targets:
            raise ValidationAppError("invalid_targets", "At least one target is required.")
        if len(body.targets) > 5:
            raise ValidationAppError("too_many_targets", "Up to five targets are supported.")
        if body.depth not in self.VALID_DEPTHS:
            raise ValidationAppError("invalid_depth", "depth must be overview, standard, or detailed.")

    @staticmethod
    def _build_theme(body: ResearchRequest) -> str:
        if body.purpose and body.purpose.strip():
            return body.purpose.strip()
        return body.targets[0] if len(body.targets) == 1 else " / ".join(body.targets[:3])
