from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Any, Callable


STUDY_AI_ROOT = Path(__file__).resolve().parents[1]
BACKEND_SOURCE = STUDY_AI_ROOT / "src" / "backend" / "src"
sys.path.insert(0, str(BACKEND_SOURCE))

from studyai.systems.ai_learning.catalog import SYSTEMS  # noqa: E402
from studyai.systems.ai_learning.service import LearningSystemService  # noqa: E402


class OfflineEmbeddingClient:
    async def embed(self, texts: list[str]) -> list[list[float]]:
        return [
            [float(len(text)), float(sum(ord(character) for character in text) % 997 + 1)]
            for text in texts
        ]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def validate_system17(result: dict[str, Any]) -> None:
    output = result["result"]
    require(output["char_count"] > 0, "system17 must count characters")
    require(output["estimated_tokens"] == len(output["token_segments"]), "system17 token count must match segments")


def validate_system18(result: dict[str, Any]) -> None:
    rows = result["result"]["results"]
    require(bool(rows), "system18 must return ranked documents")
    require(rows == sorted(rows, key=lambda row: row["score"], reverse=True), "system18 results must be score ordered")


def validate_system19(result: dict[str, Any]) -> None:
    output = result["result"]
    token_count = len(output["tokens"])
    require(token_count > 0, "system19 must return tokens")
    require(len(output["attention_matrix"]) == token_count, "system19 matrix row count must match tokens")
    require(all(len(row) == token_count for row in output["attention_matrix"]), "system19 matrix must be square")


def validate_system20(result: dict[str, Any]) -> None:
    output = result["result"]
    require(output["truncated"] is True, "system20 default input must demonstrate truncation")
    require(output["estimated_tokens"] > 40, "system20 default input must exceed its context limit")


def validate_system21(result: dict[str, Any]) -> None:
    output = result["result"]
    runs = output["runs"]
    require(len(runs) == 6, "system21 default matrix must contain six runs")
    require({row["temperature"] for row in runs} == {0.1, 0.7}, "system21 must compare both temperatures")
    require(output["generation_mode"] == "mock", "system21 offline validation must explicitly use mock mode")
    require(len(output["diff_summary"]["per_temperature"]) == 2, "system21 must summarize each temperature")


def validate_system22(result: dict[str, Any]) -> None:
    output = result["result"]
    comparisons = output["comparisons"]
    require(len(comparisons) == 3, "system22 default input must compare three chunk settings")
    require(output["question_count"] == 2, "system22 must use the two fixed questions")
    require(all(row["summary"]["chunk_count"] == len(row["chunks"]) for row in comparisons), "system22 chunk counts must match chunks")
    require(all(len(row["question_results"]) == output["question_count"] for row in comparisons), "system22 must evaluate every question for every setting")
    require(output["recommendation"]["config_id"] in {row["config_id"] for row in comparisons}, "system22 recommendation must identify a compared setting")


def validate_system23(result: dict[str, Any]) -> None:
    output = result["result"]
    before = output["initial_ranking"]
    after = output["reranked_ranking"]
    require(output["search_mode"] == "mock", "system23 offline validation must explicitly use mock mode")
    require(len(before) == result["input"]["initial_top_k"], "system23 must return initial top-k")
    require(len(after) == result["input"]["rerank_top_k"], "system23 must return rerank top-k")
    require(output["correct_document"]["document_id"] == result["input"]["correct_document_id"], "system23 must track the correct document")
    require(output["processing_summary"]["reranked_candidate_count"] == len(before), "system23 must rerank only the initial candidates")


def validate_system24(result: dict[str, Any]) -> None:
    output = result["result"]
    rows = output["model_results"]
    models = result["input"]["models"]
    require(output["comparison_mode"] == "mock", "system24 offline validation must explicitly use mock mode")
    require([row["model_id"] for row in rows] == [model["id"] for model in models], "system24 must return every model profile")
    require(output["selected_model_id"] in {model["id"] for model in models}, "system24 selected model must be one of the candidates")
    require(
        all({"answer", "quality_score", "elapsed_ms", "estimated_cost", "operational_note"} <= row.keys() for row in rows),
        "system24 metrics are incomplete",
    )
    require(bool(output["rejected_models"]), "system24 must record rejection reasons")


def validate_system25(result: dict[str, Any]) -> None:
    output = result["result"]
    rows = output["matrix_results"]
    trial_count = result["input"]["trial_count"]
    expected = {
        (max_tokens, temperature): trial_count
        for max_tokens in result["input"]["max_tokens_values"]
        for temperature in result["input"]["temperatures"]
    }
    actual = {
        condition: sum(1 for row in rows if (row["max_tokens"], row["temperature"]) == condition)
        for condition in expected
    }
    require(output["generation_mode"] == "mock", "system25 offline validation must explicitly use mock mode")
    require(actual == expected, "system25 must execute every condition for the requested trial count")
    require(all(row["finish_reason"] in {"stop", "length"} for row in rows), "system25 finish reasons are incomplete")
    require(all(row["cutoff"] == (row["finish_reason"] == "length") for row in rows), "system25 cutoff detection is inconsistent")
    require(
        output["recommendation"]["max_tokens"] in result["input"]["max_tokens_values"],
        "system25 recommendation must use one of the compared output limits",
    )


def validate_system26(result: dict[str, Any]) -> None:
    output = result["result"]
    rows = output["profile_results"]
    require(output["comparison_mode"] == "mock", "system26 offline validation must explicitly use mock mode")
    require(
        [row["profile_id"] for row in rows] == [profile["id"] for profile in result["input"]["quantization_profiles"]],
        "system26 must preserve profile order",
    )
    require(
        all({"answer", "memory_mb", "elapsed_ms", "quality_score", "balanced_score"} <= row.keys() for row in rows),
        "system26 comparison metrics are incomplete",
    )
    require(output["selected_profile_id"] in {row["profile_id"] for row in rows}, "system26 selected an unknown profile")
    require(bool(output["tradeoff_note"]), "system26 tradeoff note is missing")


def validate_system27(result: dict[str, Any]) -> None:
    rows = result["result"]["variant_results"]
    require(len(rows) == len(result["input"]["image_variants"]), "system27 must return every image variant")
    require(result["result"]["comparison_mode"] == "mock", "system27 offline validation must explicitly use mock mode")
    require(all(0 <= row["accuracy"] <= 1 for row in rows), "system27 accuracy must be bounded")
    require(all(row["image_data_url"].startswith("data:image/jpeg;base64,") for row in rows), "system27 must prepare every image")
    require(rows[-1]["accuracy"] > rows[0]["accuracy"], "system27 default large image must score above small")
    require(result["result"]["recommended_variant_id"] == "large", "system27 must recommend the smallest full-score image")


def validate_system28(result: dict[str, Any]) -> None:
    output = result["result"]
    normalized = output["normalized_text"]
    require("O3" not in normalized and "03" in normalized, "system28 must apply the O-to-zero rule")
    require("  " not in normalized and "　" not in normalized, "system28 must normalize whitespace")
    require("返晶" not in normalized and "返品" in normalized, "system28 must apply the correction dictionary")
    require(output["diffs"][-1]["after"] == normalized, "system28 final diff must contain the normalized text")
    require(any(diff["review_required"] for diff in output["diffs"]), "system28 must separate manual review corrections")
    require(output["review_status"] == "要確認", "system28 must report the manual review state")


def validate_system29(result: dict[str, Any]) -> None:
    output = result["result"]
    chunk = output["chunks"][0]
    metadata = result["input"]["metadata"]
    require(chunk["metadata"] == metadata, "system29 must preserve chunk metadata")
    require(output["filter_result"]["matched"] is True, "system29 default metadata filter must match")
    require(len(output["search_results"]) == 1, "system29 default search must return one result")
    require(
        output["citation_preview"] == [f"{metadata['source']} / {metadata['page']}ページ / {metadata['section']}"],
        "system29 citation preview is invalid",
    )
    require(
        output["traceability_fields"] == ["source", "page", "section", "permission", "updated_at"],
        "system29 traceability metadata is incomplete",
    )


def validate_system30(result: dict[str, Any]) -> None:
    output = result["result"]
    documents = output["documents"]
    valid_ids = {document["document_id"] for document in documents}
    expected_pairs = len(documents) * (len(documents) - 1) // 2
    require(len(output["candidate_pairs"]) == expected_pairs, "system30 must compare every document pair")
    require(output["candidate_count"] > 0, "system30 default input must return duplicate candidates")
    require(output["exact_match_count"] > 0, "system30 default input must include an exact match")
    require(output["similar_match_count"] > 0, "system30 default input must include a similar version")
    require(bool(output["duplicate_groups"]), "system30 default input must return review groups")
    for group in output["duplicate_groups"]:
        require(set(group["document_ids"]) <= valid_ids, "system30 returned an unknown document id")
    require(output["resolution"]["preferred_document_id"] in valid_ids, "system30 preferred document is invalid")
    require(
        set(output["resolution"]["excluded_document_ids"]) <= valid_ids,
        "system30 excluded document is invalid",
    )
    require(bool(output["search_bias_preview"]), "system30 must show the retrieval bias preview")
    require(bool(output["learning_note"]), "system30 must preserve the learning note")


def validate_system31(result: dict[str, Any]) -> None:
    output = result["result"]
    require(output["case_id"].startswith("case-"), "system31 case id is invalid")
    require(output["ground_truth_case"]["question"] == result["input"]["question"], "system31 question was not preserved")
    require(output["ground_truth_case"]["expected_answer"] == result["input"]["expected_answer"], "system31 expected answer was not preserved")
    require(all(item["source_exists"] for item in output["ground_truth_case"]["evidence"]), "system31 evidence source is invalid")
    require(all(item["quote_found"] for item in output["ground_truth_case"]["evidence"]), "system31 evidence quote is invalid")
    require(output["rubric_weight_total"] == 1.0, "system31 rubric weights must total 1")
    require(output["review_status"] == "approved", "system31 default case must be approved")
    require(output["ready_for_evaluation"] is True, "system31 default case must be ready for evaluation")
    require(not output["validation_issues"], "system31 default case must not have validation issues")
    require(bool(output["review_history"]), "system31 must preserve the review history")
    require(bool(output["learning_note"]), "system31 must preserve the learning note")


def validate_system32(result: dict[str, Any]) -> None:
    output = result["result"]
    rows = output["case_results"]
    metrics = output["metrics"]
    require(
        len(rows) == len(result["input"]["ground_truth_cases"]),
        "system32 must return every ground-truth case",
    )
    require(
        all(
            {"case_id", "retrieval_success", "generation_success", "failure_type", "answer_score"}
            <= row.keys()
            for row in rows
        ),
        "system32 case result is incomplete",
    )
    require(metrics["retrieval_success_rate"] == 0.667, "system32 retrieval success rate is invalid")
    require(metrics["generation_success_rate"] == 0.667, "system32 generation success rate is invalid")
    require(metrics["retrieval_failure_count"] == 1, "system32 must classify one retrieval failure")
    require(metrics["generation_failure_count"] == 1, "system32 must classify one generation failure")
    require(
        {row["failure_type"] for row in rows} == {"none", "retrieval_failure", "generation_failure"},
        "system32 must distinguish success, retrieval failure, and generation failure",
    )
    require(output["regression_diff"]["has_previous_run"] is False, "system32 first run must not have a baseline")
    require(bool(output["learning_note"]), "system32 must preserve the learning note")


def validate_system33(result: dict[str, Any]) -> None:
    output = result["result"]
    cases = result["input"]["query_cases"]
    require(output["case_count"] == len(cases), "system33 case count is invalid")
    require(len(output["case_results"]) == len(cases), "system33 case results are incomplete")
    expected_hit_rate = sum(1 for row in output["case_results"] if row["hit_at_k"] == 1.0) / len(cases)
    require(output["metrics"]["hit_rate"] == round(expected_hit_rate, 3), "system33 hit rate is invalid")
    require(isinstance(output["saved"], bool), "system33 storage status is missing")


def validate_system34(result: dict[str, Any]) -> None:
    output = result["result"]
    scores = output["score_breakdown"]
    require(
        {"correctness", "groundedness", "completeness", "conciseness"} == scores.keys(),
        "system34 score breakdown is incomplete",
    )
    require(all(0 <= score <= 1 for score in scores.values()), "system34 scores must be bounded")
    require(all(score == 1.0 for score in scores.values()), "system34 default answer must pass all checks")
    require(len(output["point_results"]) == len(result["input"]["expected_points"]), "system34 point results are incomplete")
    require(len(output["claim_results"]) == len(result["input"]["answer_claims"]), "system34 claim results are incomplete")
    require(output["classifications"][0]["code"] == "acceptable", "system34 default answer must be acceptable")
    require(isinstance(output["risk_flags"], list), "system34 risk flags must be a list")
    require(isinstance(output["saved"], bool), "system34 storage status is missing")


def validate_system35(result: dict[str, Any]) -> None:
    output = result["result"]
    require(output["winner"] == "B", "system35 default comparison must select prompt B")
    require(set(output["average_scores"]) == {"A", "B"}, "system35 must score both prompts")
    require(output["case_count"] == len(result["input"]["evaluation_cases"]), "system35 case count is invalid")
    require(len(output["case_results"]) == output["case_count"], "system35 case results are incomplete")
    require(len(output["improved_cases"]) == 2, "system35 must record two improved cases")
    require(len(output["regressed_cases"]) == 1, "system35 must record one regressed case")
    require(output["adoption_record"]["matches_recommendation"] is True, "system35 adoption record is invalid")
    require(isinstance(output["saved"], bool), "system35 storage status is missing")


def validate_system36(result: dict[str, Any]) -> None:
    output = result["result"]
    require(output["trace_id"].startswith("trace-"), "system36 trace id is invalid")
    require(output["trace_record"]["evaluation"]["evaluation_id"] == "answer-eval-001", "system36 evaluation is not linked")
    require(output["missing_fields"] == [], "system36 default trace must be replayable")
    require(output["replay_ready"] is True, "system36 replay status is invalid")
    require(isinstance(output["saved"], bool), "system36 storage status is missing")
    require(output["masking"]["masking_terms_persisted"] is False, "system36 must not persist masking terms")
    require(bool(output["replay_note"]), "system36 must provide a replay note")


SYSTEM_VALIDATORS: dict[str, Callable[[dict[str, Any]], None]] = {
    "system17": validate_system17,
    "system18": validate_system18,
    "system19": validate_system19,
    "system20": validate_system20,
    "system21": validate_system21,
    "system22": validate_system22,
    "system23": validate_system23,
    "system24": validate_system24,
    "system25": validate_system25,
    "system26": validate_system26,
    "system27": validate_system27,
    "system28": validate_system28,
    "system29": validate_system29,
    "system30": validate_system30,
    "system31": validate_system31,
    "system32": validate_system32,
    "system33": validate_system33,
    "system34": validate_system34,
    "system35": validate_system35,
    "system36": validate_system36,
}


def validate(system_ids: list[str], show_output: bool) -> None:
    service = LearningSystemService(embedding_client=OfflineEmbeddingClient())
    for system_id in system_ids:
        payload = {"mode": "mock"} if system_id in {"system21", "system23", "system24", "system25", "system26", "system27"} else None
        run = (
            asyncio.run(service.execute_async(system_id, payload))
            if system_id == "system18"
            else service.execute(system_id, payload)
        )
        require(run["system_id"] == system_id, f"{system_id} returned a different system id")
        require(run["run_id"].startswith(f"{system_id}-"), f"{system_id} returned an invalid run id")
        require(bool(run["result"]), f"{system_id} returned an empty result")
        require(service.list_runs(system_id)[0]["run_id"] == run["run_id"], f"{system_id} run history was not updated")
        if system_id in SYSTEM_VALIDATORS:
            SYSTEM_VALIDATORS[system_id](run)
        print(f"PASS {system_id}: {run['title']} ({run['category']})")
        if show_output:
            print(json.dumps(run, ensure_ascii=False, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate StudyAI systems 17-36 without external services.")
    parser.add_argument("system_ids", nargs="*", help="system17 through system36; omit to validate all")
    parser.add_argument("--show-output", action="store_true", help="print input, result, and observation as JSON")
    args = parser.parse_args()

    requested = args.system_ids or sorted(SYSTEMS)
    unknown = [system_id for system_id in requested if system_id not in SYSTEMS]
    if unknown:
        parser.error(f"unknown system id: {', '.join(unknown)}")

    validate(requested, args.show_output)
    print(f"StudyAI learning validation passed: {', '.join(requested)}")


if __name__ == "__main__":
    main()
