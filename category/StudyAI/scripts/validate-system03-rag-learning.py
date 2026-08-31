from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
from types import ModuleType
from typing import Any


SERVICE_DIR = (
    Path(__file__).resolve().parents[1]
    / "src"
    / "backend"
    / "src"
    / "studyai"
    / "systems"
    / "system03"
    / "services"
)


def load_service_module(module_name: str) -> ModuleType:
    module_path = SERVICE_DIR / f"{module_name}.py"
    spec = importlib.util.spec_from_file_location(f"system03_{module_name}", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {module_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


ChunkService = load_service_module("chunk_service").ChunkService
score_candidate = load_service_module("retrieval_scoring").score_candidate


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def build_observation() -> dict[str, Any]:
    source_text = (
        "# Database migration\n"
        + ("Database migration rollback requires a verified backup. " * 3)
        + "\n# Incident response\n"
        + "Record the timeout, request ID, and recovery result in the incident log."
    )
    chunks = ChunkService(max_chars=90, overlap_chars=15).make_chunks(source_text)
    require(len(chunks) >= 3, "long sections must be split into multiple chunks")
    require(chunks[0]["section_title"] == "# Database migration", "first heading must be preserved")
    require(chunks[-1]["section_title"] == "# Incident response", "last heading must be preserved")
    require(
        [chunk["chunk_no"] for chunk in chunks] == list(range(1, len(chunks) + 1)),
        "chunk numbers must be sequential",
    )

    question = "database migration rollback"
    question_embedding = [1.0, 0.0]
    candidates = [
        {
            "candidate_id": "runbook",
            "text": "database migration rollback runbook",
            "embedding": [1.0, 0.0],
        },
        {
            "candidate_id": "semantic-only",
            "text": "service recovery guide",
            "embedding": [0.8, 0.2],
        },
        {
            "candidate_id": "unrelated",
            "text": "frontend color palette",
            "embedding": [0.0, 1.0],
        },
    ]
    scored = [
        {
            "candidate_id": candidate["candidate_id"],
            **score_candidate(
                question,
                question_embedding,
                str(candidate["text"]),
                list(candidate["embedding"]),
            ),
        }
        for candidate in candidates
    ]
    ranked = sorted(scored, key=lambda item: item["hybrid_score"], reverse=True)
    require(ranked[0]["candidate_id"] == "runbook", "matching evidence must rank first")
    require(ranked[0]["keyword_score"] == 1.0, "matching evidence must cover all question tokens")
    require(ranked[0]["vector_score"] == 1.0, "matching evidence must have identical sample vectors")

    return {
        "registration_flow": {
            "source_sections": 2,
            "chunk_count": len(chunks),
            "chunks": chunks,
        },
        "retrieval_flow": {
            "question": question,
            "weights": {"keyword": 0.4, "vector": 0.6},
            "ranking": ranked,
        },
        "boundary": "This validation does not call PostgreSQL, an embedding model, or an LLM.",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate the dependency-free part of the system03 RAG path.")
    parser.add_argument("--show-output", action="store_true", help="Print chunks and retrieval scores as JSON.")
    args = parser.parse_args()

    observation = build_observation()
    if args.show_output:
        print(json.dumps(observation, ensure_ascii=False, indent=2))
    print("PASS system03: chunking and hybrid retrieval scoring")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
