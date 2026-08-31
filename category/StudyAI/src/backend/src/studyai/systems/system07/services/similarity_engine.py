from __future__ import annotations

import math

from studyai.systems.system07.models.catalog import System07Document


class SimilarityEngine:
    def find_similar(
        self,
        *,
        target_document: System07Document,
        candidate_documents: list[System07Document],
        limit: int = 5,
    ) -> list[dict[str, object]]:
        results: list[dict[str, object]] = []
        target_embeddings = [chunk.embedding for chunk in target_document.chunks if chunk.embedding]
        if not target_embeddings:
            return []
        for candidate in candidate_documents:
            candidate_embeddings = [chunk.embedding for chunk in candidate.chunks if chunk.embedding]
            if not candidate_embeddings:
                continue
            best_score = 0.0
            for left in target_embeddings:
                for right in candidate_embeddings:
                    best_score = max(best_score, self._cosine_similarity(left, right))
            if best_score > 0:
                results.append({"document": candidate, "similarity_score": round(best_score, 4)})
        results.sort(key=lambda item: item["similarity_score"], reverse=True)
        return results[:limit]

    @staticmethod
    def _cosine_similarity(left: list[float], right: list[float]) -> float:
        if not left or not right or len(left) != len(right):
            return 0.0
        numerator = sum(a * b for a, b in zip(left, right, strict=True))
        left_norm = math.sqrt(sum(a * a for a in left))
        right_norm = math.sqrt(sum(b * b for b in right))
        if left_norm == 0 or right_norm == 0:
            return 0.0
        return max(0.0, numerator / (left_norm * right_norm))
