from __future__ import annotations

import json
from dataclasses import dataclass

from pydantic import ValidationError

from studyai.common.ai.llm_client import LLMClient
from studyai.common.errors.models import ExternalServiceError, ValidationAppError
from studyai.systems.system02.prompts.review_prompt import COMPARE_SYSTEM_PROMPT
from studyai.systems.system02.schemas.review import GeneratedComparison


@dataclass(frozen=True)
class ComparisonGenerationResult:
    issues: list[dict]
    model_used: str
    input_tokens: int | None
    output_tokens: int | None
    retry_count: int


class CompareReviewEngine:
    MAX_RETRIES = 3

    def __init__(self, llm_client: LLMClient | None = None) -> None:
        self.llm_client = llm_client or LLMClient()

    async def run_compare(self, aligned_chunks: list[dict]) -> ComparisonGenerationResult:
        user_prompt = json.dumps(
            {
                "aligned_chunks": [
                    {
                        "article": item["article"],
                        "document_a": item.get("chunk_a", {}).get("chunk_text") if item.get("chunk_a") else None,
                        "document_b": item.get("chunk_b", {}).get("chunk_text") if item.get("chunk_b") else None,
                    }
                    for item in aligned_chunks
                ],
                "instructions": [
                    "対応条項を順番に比較する",
                    "追加、削除、変更を区別する",
                    "入力にない条文や事実を作らない",
                    "法的確定判断を避ける",
                ],
            },
            ensure_ascii=False,
        )
        last_validation_error: ValidationError | None = None
        for attempt in range(self.MAX_RETRIES + 1):
            try:
                model_result = await self.llm_client.extract_json_with_metadata(
                    COMPARE_SYSTEM_PROMPT,
                    user_prompt,
                    max_tokens=512,
                    reasoning_effort="none",
                )
                payload = GeneratedComparison.model_validate(model_result.data)
                return ComparisonGenerationResult(
                    issues=[issue.model_dump() for issue in payload.issues],
                    model_used=self.llm_client.settings.get_llm_model(),
                    input_tokens=model_result.input_tokens,
                    output_tokens=model_result.output_tokens,
                    retry_count=attempt,
                )
            except ValidationError as exc:
                last_validation_error = exc
            except ExternalServiceError as exc:
                if exc.error_code != "invalid_model_output" or attempt == self.MAX_RETRIES:
                    raise
            if attempt == self.MAX_RETRIES:
                break
        raise ValidationAppError(
            "invalid_model_output",
            "LLMの契約比較結果が指定形式に適合しません。",
            {"validation_errors": last_validation_error.errors() if last_validation_error else []},
        )
