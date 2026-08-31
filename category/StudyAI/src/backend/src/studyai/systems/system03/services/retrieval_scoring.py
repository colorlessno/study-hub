from __future__ import annotations

import math
import re


TOKEN_PATTERN = re.compile(r"[0-9A-Za-z_]+|[ぁ-んァ-ン一-龥]{2,}")


def keyword_score(question: str, chunk_text: str) -> float:
    question_tokens = {token.lower() for token in TOKEN_PATTERN.findall(question)}
    if not question_tokens:
        return 0.0
    chunk_tokens = {token.lower() for token in TOKEN_PATTERN.findall(chunk_text)}
    if not chunk_tokens:
        return 0.0
    matched = len(question_tokens & chunk_tokens)
    return matched / len(question_tokens)


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    numerator = sum(a * b for a, b in zip(left, right, strict=True))
    left_norm = math.sqrt(sum(a * a for a in left))
    right_norm = math.sqrt(sum(b * b for b in right))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return max(0.0, numerator / (left_norm * right_norm))


def score_candidate(
    question: str,
    question_embedding: list[float],
    chunk_text: str,
    chunk_embedding: list[float],
    *,
    keyword_weight: float = 0.4,
    vector_weight: float = 0.6,
) -> dict[str, float]:
    if keyword_weight < 0 or vector_weight < 0:
        raise ValueError("retrieval weights must not be negative")
    if not math.isclose(keyword_weight + vector_weight, 1.0):
        raise ValueError("retrieval weights must total 1.0")

    keyword = keyword_score(question, chunk_text)
    vector = cosine_similarity(question_embedding, chunk_embedding)
    return {
        "keyword_score": keyword,
        "vector_score": vector,
        "hybrid_score": keyword * keyword_weight + vector * vector_weight,
    }
