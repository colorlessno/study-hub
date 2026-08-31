from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class JSONExtractionResult:
    data: dict
    raw_output: str
    input_tokens: int | None = None
    output_tokens: int | None = None
    response_model: str | None = None
