from __future__ import annotations

from studyai.common.ai.llm_client import LLMClient

from studyai.systems.system08.prompts.task_agent_prompt import QUERY_PLANNER_PROMPT
from studyai.systems.system08.schemas.analysis import AnalysisCreateRequest


class QueryPlanner:
    def __init__(self) -> None:
        self.llm_client = LLMClient()

    async def plan_queries(self, body: AnalysisCreateRequest) -> list[str]:
        fallback = self._fallback_queries(body)
        user_prompt = (
            f"テーマ: {body.theme}\n"
            f"背景: {body.background or 'なし'}\n"
            f"現状: {body.current_status or 'なし'}\n"
            f"制約: {body.constraints or 'なし'}\n"
            f"役割: {body.role or 'なし'}\n"
            f"深さ: {body.depth}\n"
            "JSON形式で queries 配列を返してください。"
        )
        try:
            payload = await self.llm_client.extract_json(QUERY_PLANNER_PROMPT, user_prompt)
        except Exception:
            return fallback

        queries = payload.get("queries")
        if not isinstance(queries, list):
            return fallback

        normalized: list[str] = []
        seen: set[str] = set()
        for item in queries:
            query = str(item).strip()
            if not query or query in seen:
                continue
            normalized.append(query)
            seen.add(query)
            if len(normalized) >= 10:
                break
        return normalized or fallback

    def _fallback_queries(self, body: AnalysisCreateRequest) -> list[str]:
        queries = [
            body.theme,
            f"{body.theme} 進め方",
            f"{body.theme} タスク分解",
        ]
        if body.background:
            queries.append(f"{body.theme} {body.background[:50]}")
        if body.current_status:
            queries.append(f"{body.theme} 現状課題 {body.current_status[:50]}")
        if body.role:
            queries.append(f"{body.theme} {body.role} 観点")
        if body.constraints:
            queries.append(f"{body.theme} 制約 {body.constraints[:50]}")

        normalized: list[str] = []
        seen: set[str] = set()
        for query in queries:
            value = query.strip()
            if not value or value in seen:
                continue
            normalized.append(value)
            seen.add(value)
        return normalized[:10]
