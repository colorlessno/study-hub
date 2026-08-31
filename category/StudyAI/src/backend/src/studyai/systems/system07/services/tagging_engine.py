from __future__ import annotations

from studyai.common.ai.llm_client import LLMClient
from studyai.systems.system07.prompts.tagging_prompt import build_tagging_prompt
from studyai.systems.system07.schemas.catalog import AutoTagResult


class TaggingEngine:
    def __init__(self) -> None:
        self.llm_client = LLMClient()

    async def analyze_document(self, document_text: str, existing_tags: list[str]) -> AutoTagResult:
        system_prompt, user_prompt = build_tagging_prompt(
            document_text=document_text[:12000],
            existing_tags=existing_tags,
        )
        raw = await self.llm_client.extract_json(system_prompt, user_prompt)
        return AutoTagResult.model_validate(raw)
