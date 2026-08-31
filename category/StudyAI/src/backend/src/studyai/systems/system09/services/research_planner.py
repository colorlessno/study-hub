from __future__ import annotations

import asyncio

from studyai.common.ai.llm_client import LLMClient
from studyai.systems.system09.prompts.research_prompt import build_plan_prompt
from studyai.systems.system09.schemas.research import ResearchRequest


class ResearchPlanner:
    MODEL_TIMEOUT_SECONDS = 15.0

    def __init__(self) -> None:
        self.llm_client = LLMClient()

    async def build_research_plan(self, request: ResearchRequest) -> list[dict]:
        system_prompt, user_prompt = build_plan_prompt(request)
        fallback = [
            {
                "topic": area,
                "priority": index,
                "search_hints": request.targets,
            }
            for index, area in enumerate(request.focus_areas or [request.research_type], start=1)
        ]
        try:
            raw = await asyncio.wait_for(
                self.llm_client.extract_json(system_prompt, user_prompt),
                timeout=self.MODEL_TIMEOUT_SECONDS,
            )
            plan = raw.get("plan")
            if isinstance(plan, list) and plan:
                filtered = [item for item in plan if isinstance(item, dict)]
                if filtered:
                    return filtered
        except Exception:
            pass
        return fallback
