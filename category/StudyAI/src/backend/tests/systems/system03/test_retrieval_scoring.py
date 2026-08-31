import pytest

from studyai.systems.system03.services.retrieval_scoring import (
    cosine_similarity,
    keyword_score,
    score_candidate,
)


def test_keyword_score_uses_question_token_coverage():
    assert keyword_score("database migration rollback", "rollback the database migration") == 1.0
    assert keyword_score("database migration rollback", "frontend design") == 0.0


def test_cosine_similarity_handles_identical_and_invalid_vectors():
    assert cosine_similarity([1.0, 0.0], [1.0, 0.0]) == pytest.approx(1.0)
    assert cosine_similarity([1.0, 0.0], [1.0]) == 0.0
    assert cosine_similarity([0.0, 0.0], [1.0, 0.0]) == 0.0


def test_score_candidate_combines_keyword_and_vector_scores():
    result = score_candidate(
        "database migration rollback",
        [1.0, 0.0],
        "database migration rollback runbook",
        [1.0, 0.0],
    )

    assert result == {
        "keyword_score": 1.0,
        "vector_score": 1.0,
        "hybrid_score": 1.0,
    }


def test_score_candidate_rejects_invalid_weights():
    with pytest.raises(ValueError, match="total 1.0"):
        score_candidate("question", [1.0], "chunk", [1.0], keyword_weight=0.5, vector_weight=0.6)
