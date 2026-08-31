from __future__ import annotations

import asyncio
from types import SimpleNamespace
from typing import Any

from studyai.common.agent_graph.policies import LoopPolicy
from studyai.common.agent_graph.tracing import record_step_failure, record_step_start, record_step_success
from studyai.common.errors.models import ValidationAppError
from studyai.systems.system08.repositories.analysis_repository import AnalysisRepository
from studyai.systems.system08.schemas.analysis import AnalysisCreateRequest
from studyai.systems.system08.services.export_service import ExportService
from studyai.systems.system08.services.priority_scorer import PriorityScorer
from studyai.systems.system08.services.query_planner import QueryPlanner
from studyai.systems.system08.services.search_evaluator import SearchEvaluator
from studyai.systems.system08.services.task_generator import TaskGenerator
from studyai.common.search.source_evaluator import SourceEvaluator
from studyai.common.search.web_fetch_tool import WebFetchTool
from studyai.common.search.web_search_tool import WebSearchTool


class System08GraphNodes:
    FETCH_TIMEOUT_SECONDS = 8.0
    VALID_DEPTHS = {"概要レベル", "標準レベル", "詳細レベル"}
    VALID_EXPORT_FORMATS = {"markdown", "csv", "json"}

    def __init__(
        self,
        *,
        query_planner: QueryPlanner | None = None,
        search_evaluator: SearchEvaluator | None = None,
        task_generator: TaskGenerator | None = None,
        priority_scorer: PriorityScorer | None = None,
        export_service: ExportService | None = None,
        search_tool: WebSearchTool | None = None,
        fetch_tool: WebFetchTool | None = None,
        source_evaluator: SourceEvaluator | None = None,
        loop_policy: LoopPolicy | None = None,
    ) -> None:
        self.query_planner = query_planner or QueryPlanner()
        self.search_evaluator = search_evaluator or SearchEvaluator()
        self.task_generator = task_generator or TaskGenerator()
        self.priority_scorer = priority_scorer or PriorityScorer()
        self.export_service = export_service or ExportService()
        self.search_tool = search_tool or WebSearchTool()
        self.fetch_tool = fetch_tool or WebFetchTool()
        self.source_evaluator = source_evaluator or SourceEvaluator()
        self.loop_policy = loop_policy or LoopPolicy(max_iterations=10, stop_if_no_progress=False)

    async def validate_input(self, state: dict[str, Any]) -> dict[str, Any]:
        handle = record_step_start(state, step_name="validate_input")
        try:
            request = self._request_from_state(state)
            self._validate_request(request)
            record_step_success(state, handle=handle, next_step="plan_queries")
            return {}
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="validate_input_failed", error_message=str(exc))
            raise

    async def plan_queries(self, state: dict[str, Any]) -> dict[str, Any]:
        handle = record_step_start(state, step_name="plan_queries")
        try:
            request = self._request_from_state(state)
            queries = await self.query_planner.plan_queries(request)
            record_step_success(
                state,
                handle=handle,
                next_step="search_once",
                metadata={"query_count": len(queries)},
            )
            return {
                "queries": queries,
                "current_query_index": 0,
                "current_search_results": [],
                "raw_sources": [],
                "accepted_sources": [],
                "search_count": 0,
                "search_queries": [],
            }
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="plan_queries_failed", error_message=str(exc))
            raise

    async def search_once(self, state: dict[str, Any]) -> dict[str, Any]:
        handle = record_step_start(state, step_name="search_once")
        try:
            queries = [str(item).strip() for item in state.get("queries", []) if str(item).strip()]
            current_query_index = int(state.get("current_query_index", 0))
            if current_query_index >= len(queries):
                record_step_success(state, handle=handle, next_step="fetch_sources", metadata={"query": None})
                return {"current_search_results": [], "current_query": ""}

            current_query = queries[current_query_index]
            try:
                current_search_results = await self.search_tool.search(current_query, max_results=4)
            except Exception:
                current_search_results = []

            search_queries = list(state.get("search_queries", []))
            search_queries.append(current_query)
            search_count = int(state.get("search_count", 0)) + 1

            record_step_success(
                state,
                handle=handle,
                next_step="fetch_sources",
                metadata={"query": current_query, "result_count": len(current_search_results)},
            )
            return {
                "current_query": current_query,
                "current_query_index": current_query_index + 1,
                "current_search_results": current_search_results,
                "search_count": search_count,
                "search_queries": search_queries,
            }
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="search_once_failed", error_message=str(exc))
            raise

    async def fetch_sources(self, state: dict[str, Any]) -> dict[str, Any]:
        handle = record_step_start(state, step_name="fetch_sources")
        try:
            raw_sources: list[dict[str, Any]] = list(state.get("raw_sources", []))
            search_results = list(state.get("current_search_results", []))

            async def fetch_result(result: dict[str, Any]) -> dict[str, Any] | None:
                url = str(result.get("url") or "").strip()
                if not url:
                    return None
                try:
                    fetched = await asyncio.wait_for(
                        self.fetch_tool.fetch(url),
                        timeout=self.FETCH_TIMEOUT_SECONDS,
                    )
                except Exception:
                    return None
                return {**result, **fetched}

            fetched_sources = []
            for result in search_results:
                fetched_sources.append(await fetch_result(result))
            raw_sources.extend(source for source in fetched_sources if source is not None)

            record_step_success(
                state,
                handle=handle,
                next_step="filter_sources",
                metadata={"raw_source_count": len(raw_sources)},
            )
            return {"raw_sources": raw_sources}
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="fetch_sources_failed", error_message=str(exc))
            raise

    async def filter_sources(self, state: dict[str, Any]) -> dict[str, Any]:
        handle = record_step_start(state, step_name="filter_sources")
        try:
            request = self._request_from_state(state)
            raw_sources = list(state.get("raw_sources", []))
            accepted_sources = self.source_evaluator.filter_sources(
                raw_sources,
                max_sources=self._source_limit(request.depth),
            )
            record_step_success(
                state,
                handle=handle,
                next_step="judge_continue",
                metadata={"accepted_source_count": len(accepted_sources)},
            )
            return {"accepted_sources": accepted_sources}
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="filter_sources_failed", error_message=str(exc))
            raise

    async def judge_continue(self, state: dict[str, Any]) -> dict[str, Any]:
        handle = record_step_start(state, step_name="judge_continue")
        try:
            request = self._request_from_state(state)
            accepted_sources = list(state.get("accepted_sources", []))
            current_query_index = int(state.get("current_query_index", 0))
            total_queries = len(list(state.get("queries", [])))
            search_count = int(state.get("search_count", 0))
            has_remaining_queries = current_query_index < total_queries
            should_continue = (
                has_remaining_queries
                and self.loop_policy.should_continue(iteration=search_count, made_progress=bool(accepted_sources))
                and self.search_evaluator.need_more_search(
                    accepted_sources=accepted_sources,
                    step_count=search_count,
                    depth=request.depth,
                )
            )
            next_step = "search_once" if should_continue else "generate_tasks"
            record_step_success(
                state,
                handle=handle,
                next_step=next_step,
                metadata={
                    "has_remaining_queries": has_remaining_queries,
                    "accepted_source_count": len(accepted_sources),
                    "search_count": search_count,
                },
            )
            return {"next_step": next_step}
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="judge_continue_failed", error_message=str(exc))
            raise

    async def generate_tasks(self, state: dict[str, Any]) -> dict[str, Any]:
        handle = record_step_start(state, step_name="generate_tasks")
        try:
            request = self._request_from_state(state)
            accepted_sources = list(state.get("accepted_sources", []))
            if not accepted_sources:
                accepted_sources = [self._build_fallback_source(request)]
            generated_payload = await self.task_generator.generate_tasks(request, sources=accepted_sources)
            record_step_success(
                state,
                handle=handle,
                next_step="score_tasks",
                metadata={"task_count": len(list(generated_payload.get('tasks', [])))},
            )
            return {
                "accepted_sources": accepted_sources,
                "generated_payload": generated_payload,
                "summary": str(generated_payload.get("summary") or ""),
            }
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="generate_tasks_failed", error_message=str(exc))
            raise

    async def score_tasks(self, state: dict[str, Any]) -> dict[str, Any]:
        handle = record_step_start(state, step_name="score_tasks")
        try:
            generated_payload = dict(state.get("generated_payload") or {})
            scored_tasks, priority_summary = self.priority_scorer.score_tasks(
                list(generated_payload.get("tasks", []))
            )
            record_step_success(
                state,
                handle=handle,
                next_step="build_export",
                metadata={"task_count": len(scored_tasks)},
            )
            return {"scored_tasks": scored_tasks, "priority_summary": priority_summary}
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="score_tasks_failed", error_message=str(exc))
            raise

    async def build_export(self, state: dict[str, Any]) -> dict[str, Any]:
        handle = record_step_start(state, step_name="build_export")
        try:
            request = self._request_from_state(state)
            scored_tasks = list(state.get("scored_tasks", []))
            temporary_analysis = SimpleNamespace(
                id=0,
                theme=request.theme,
                summary=str(state.get("summary") or ""),
                search_count=int(state.get("search_count", 0)),
                priority_summary=dict(state.get("priority_summary") or {}),
                tasks=[SimpleNamespace(**task) for task in scored_tasks],
            )
            markdown = self.export_service.export_markdown(temporary_analysis)
            record_step_success(state, handle=handle, next_step="persist_analysis")
            return {"markdown": markdown}
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="build_export_failed", error_message=str(exc))
            raise

    async def persist_analysis(
        self,
        state: dict[str, Any],
        *,
        repository: AnalysisRepository,
    ) -> dict[str, Any]:
        handle = record_step_start(state, step_name="persist_analysis")
        try:
            request = self._request_from_state(state)
            scored_tasks = list(state.get("scored_tasks", []))
            search_queries = list(state.get("search_queries", []))
            accepted_sources = list(state.get("accepted_sources", []))
            summary = str(state.get("summary") or "")
            priority_summary = dict(state.get("priority_summary") or {})
            markdown = str(state.get("markdown") or "")

            analysis = await repository.create_analysis(
                theme=request.theme,
                background=request.background,
                current_status=request.current_status,
                constraints=request.constraints,
                role=request.role,
                depth=request.depth,
                output_format=request.output_format,
            )
            analysis = await repository.replace_tasks(analysis.id, scored_tasks)
            total_hours = round(
                sum(float(task.get("estimated_hours") or 0.0) for task in scored_tasks),
                1,
            )
            analysis = await repository.complete_analysis(
                analysis.id,
                search_count=int(state.get("search_count", 0)),
                search_queries=search_queries,
                sources_json=accepted_sources,
                summary=summary,
                priority_summary=priority_summary,
                markdown=markdown,
                total_tasks=len(scored_tasks),
                total_estimated_hours=total_hours,
            )
            record_step_success(
                state,
                handle=handle,
                next_step="end",
                metadata={"analysis_id": analysis.id, "task_count": len(scored_tasks)},
            )
            return {"persisted_analysis": analysis}
        except Exception as exc:
            record_step_failure(state, handle=handle, error_code="persist_analysis_failed", error_message=str(exc))
            raise

    def route_after_judge(self, state: dict[str, Any]) -> str:
        next_step = str(state.get("next_step") or "generate_tasks")
        if next_step not in {"search_once", "generate_tasks"}:
            return "generate_tasks"
        return next_step

    @staticmethod
    def _request_from_state(state: dict[str, Any]) -> AnalysisCreateRequest:
        request = state.get("request")
        if not isinstance(request, AnalysisCreateRequest):
            raise ValidationAppError("missing_request", "Analysis request was not found in graph state.")
        return request

    def _validate_request(self, body: AnalysisCreateRequest) -> None:
        if body.depth not in self.VALID_DEPTHS:
            raise ValidationAppError("invalid_depth", "depth must be 概要レベル, 標準レベル, or 詳細レベル.")
        if body.output_format not in self.VALID_EXPORT_FORMATS:
            raise ValidationAppError("invalid_output_format", "output_format must be json, markdown, or csv.")

    @staticmethod
    def _source_limit(depth: str) -> int:
        return {"概要レベル": 4, "標準レベル": 6, "詳細レベル": 8}.get(depth, 6)

    @staticmethod
    def _build_fallback_source(body: AnalysisCreateRequest) -> dict[str, Any]:
        content = "\n".join(
            part
            for part in [
                body.theme,
                body.background or "",
                body.current_status or "",
                body.constraints or "",
                body.role or "",
            ]
            if part
        )
        return {
            "title": "入力情報",
            "url": "https://local/input",
            "snippet": body.theme,
            "content": content,
            "source_type": "input",
            "domain": "local",
            "trust_level": "input",
        }
