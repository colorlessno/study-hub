from __future__ import annotations

import json
from dataclasses import dataclass

from pydantic import ValidationError

from studyai.common.ai.llm_client import LLMClient
from studyai.common.errors.models import ExternalServiceError, ValidationAppError
from studyai.systems.system02.prompts.review_prompt import REVIEW_SYSTEM_PROMPT
from studyai.systems.system02.schemas.review import GeneratedReview


@dataclass(frozen=True)
class ReviewGenerationResult:
    document_type: str
    issues: list[dict]
    model_used: str
    input_tokens: int | None
    output_tokens: int | None
    retry_count: int


class RiskReviewEngine:
    MAX_RETRIES = 3

    def __init__(self, llm_client: LLMClient | None = None) -> None:
        self.llm_client = llm_client or LLMClient()

    async def run_review(self, *, chunks: list[dict], perspective: str) -> ReviewGenerationResult:
        user_prompt = json.dumps(
            {
                "perspective": perspective,
                "chunks": [
                    {
                        "article": chunk.get("article"),
                        "text": chunk["chunk_text"],
                    }
                    for chunk in chunks
                ],
                "instructions": [
                    "すべての条項を順番に確認する",
                    "不利条件、抜け漏れ、法的確認事項を含める",
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
                    REVIEW_SYSTEM_PROMPT,
                    user_prompt,
                    max_tokens=512,
                    reasoning_effort="none",
                )
                payload = GeneratedReview.model_validate(model_result.data)
                return ReviewGenerationResult(
                    document_type=payload.document_type,
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
            "LLMの契約審査結果が指定形式に適合しません。",
            {"validation_errors": last_validation_error.errors() if last_validation_error else []},
        )
