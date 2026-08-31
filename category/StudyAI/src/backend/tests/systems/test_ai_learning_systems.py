from __future__ import annotations

import json

import pytest

from studyai.common.ai.models import JSONExtractionResult
from studyai.systems.ai_learning.catalog import SYSTEMS
from studyai.systems.ai_learning.service import LearningSystemService


@pytest.mark.parametrize("system_id", sorted(set(SYSTEMS) - {"system18", "system21", "system23", "system24", "system25"}))
def test_ai_learning_system_executes_with_default_input(system_id: str) -> None:
    service = LearningSystemService()

    result = service.execute(system_id)

    assert result["system_id"] == system_id
    assert result["run_id"].startswith(f"{system_id}-")
    assert result["result"]
    assert service.list_runs(system_id)[0]["run_id"] == result["run_id"]


def test_system17_provides_samples_and_tokenizer_notes() -> None:
    service = LearningSystemService()
    system = service.get_system("system17")

    assert [sample["id"] for sample in system.samples] == ["japanese", "english", "symbols", "mixed"]

    result = service.execute(
        "system17",
        {"text": "注文 ID: A-1024", "context_limit": 2},
    )["result"]

    assert result["over_limit"] is True
    assert result["token_segments"]
    assert any("実際のAIモデル" in note for note in result["notes"])
    assert any("入力上限" in note for note in result["notes"])


@pytest.mark.parametrize(
    "payload",
    [{"text": "", "context_limit": 32}, {"text": "sample", "context_limit": 0}],
)
def test_system17_rejects_invalid_input(payload: dict) -> None:
    service = LearningSystemService()

    with pytest.raises(ValueError):
        service.execute("system17", payload)


def test_system17_saves_and_restores_run_history(tmp_path) -> None:
    run_file = tmp_path / "system17_runs.json"
    service = LearningSystemService(system17_run_file=run_file)

    executed = service.execute("system17")

    assert executed["result"]["saved"] is True
    assert executed["result"]["storage_status"] == "JSONファイルへ保存済み"
    assert run_file.exists()
    restored_service = LearningSystemService(system17_run_file=run_file)
    assert restored_service.list_runs("system17")[0]["run_id"] == executed["run_id"]


class FakeEmbeddingClient:
    def __init__(self) -> None:
        self.requests: list[list[str]] = []
        self.vectors = iter(
            [
                [1.0, 0.0, 0.0],
                [0.9, 0.1, 0.0],
                [0.1, 0.9, 0.0],
                [0.0, 0.0, 1.0],
            ]
        )

    async def embed(self, texts: list[str]) -> list[list[float]]:
        self.requests.append(texts)
        assert len(texts) == 1
        return [next(self.vectors)]


@pytest.mark.asyncio
async def test_system18_uses_embeddings_and_stores_ranked_results(tmp_path) -> None:
    run_file = tmp_path / "system18_runs.json"
    embedding_client = FakeEmbeddingClient()
    service = LearningSystemService(
        embedding_client=embedding_client,  # type: ignore[arg-type]
        system18_run_file=run_file,
    )

    result = await service.execute_async(
        "system18",
        {
            "query": "商品を返したい",
            "documents": ["返品の手続き", "配送状況", "請求書の再発行"],
            "top_k": 3,
        },
    )

    output = result["result"]
    assert output["mode"] == "embedding"
    assert output["embedding_dimension"] == 3
    assert output["stored_document_count"] == 3
    assert output["results"][0]["text"] == "返品の手続き"
    assert output["results"][0]["evidence_text"] == "返品の手続き"
    assert output["query_embedding"] == [1.0, 0.0, 0.0]
    assert output["vector_storage"][0]["embedding"] == [0.9, 0.1, 0.0]
    assert embedding_client.requests == [["商品を返したい"], ["返品の手続き"], ["配送状況"], ["請求書の再発行"]]
    assert output["saved"] is True
    assert run_file.exists()
    assert service.list_runs("system18")[0]["run_id"] == result["run_id"]

    restored_service = LearningSystemService(system18_run_file=run_file)
    assert restored_service.list_runs("system18")[0]["run_id"] == result["run_id"]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        {"query": "", "documents": ["返品"], "top_k": 1},
        {"query": "返品", "documents": [], "top_k": 1},
        {"query": "返品", "documents": ["返品"], "top_k": 2},
    ],
)
async def test_system18_rejects_invalid_input(payload: dict) -> None:
    service = LearningSystemService(embedding_client=FakeEmbeddingClient())  # type: ignore[arg-type]

    with pytest.raises(ValueError):
        await service.execute_async("system18", payload)


def test_system20_compares_important_information_positions() -> None:
    service = LearningSystemService()
    system = service.get_system("system20")

    results = {
        sample["id"]: service.execute("system20", sample["input"])["result"]
        for sample in system.samples
    }

    assert list(results) == ["short-baseline", "important-first", "important-middle", "important-last"]
    assert results["short-baseline"]["truncated"] is False
    assert results["short-baseline"]["answerable"] is True
    assert results["important-first"]["important_position"] == "先頭"
    assert results["important-first"]["answerable"] is True
    assert results["important-middle"]["important_position"] == "中央"
    assert results["important-middle"]["answerable"] is False
    assert results["important-last"]["important_position"] == "末尾"
    assert results["important-last"]["answerable"] is False
    assert all(results[sample_id]["discarded_text"] for sample_id in ("important-first", "important-middle", "important-last"))
    assert service.list_runs("system20")[0]["input"] == system.samples[-1]["input"]


def test_system20_preserves_japanese_text_and_reports_over_limit_part() -> None:
    service = LearningSystemService()

    result = service.execute(
        "system20",
        {
            "text": "返金期限は7日です。後続の説明です。",
            "context_limit": 7,
            "important_marker": "返金期限は7日",
        },
    )["result"]

    assert result["retained_text"] == "返金期限は7日"
    assert result["discarded_text"] == "です。後続の説明です。"
    assert result["missing_markers"] == []
    assert result["answerable"] is True


def test_system20_saves_and_restores_run_history(tmp_path) -> None:
    run_file = tmp_path / "system20_runs.json"
    service = LearningSystemService(system20_run_file=run_file)

    executed = service.execute("system20")

    assert executed["result"]["saved"] is True
    assert run_file.exists()
    restored_service = LearningSystemService(system20_run_file=run_file)
    assert restored_service.list_runs("system20")[0]["run_id"] == executed["run_id"]


@pytest.mark.parametrize(
    "payload",
    [
        {"text": "", "context_limit": 10, "important_marker": "重要"},
        {"text": "重要です", "context_limit": 0, "important_marker": "重要"},
        {"text": "重要です", "context_limit": "invalid", "important_marker": "重要"},
        {"text": "重要です", "context_limit": 10, "important_marker": ""},
        {"text": "重要です", "context_limit": 10, "important_marker": "存在しない語句"},
    ],
)
def test_system20_rejects_invalid_input(payload: dict) -> None:
    service = LearningSystemService()

    with pytest.raises(ValueError):
        service.execute("system20", payload)


class FakeGenerationClient:
    def __init__(self) -> None:
        self.requests: list[tuple[str, float]] = []

    async def generate_text_with_metadata(self, prompt: str, temperature: float, *, model: str | None = None) -> dict:
        self.requests.append((prompt, temperature))
        trial = sum(1 for request in self.requests if request[1] == temperature)
        return {
            "text": f"temperature={temperature}, trial={trial}",
            "model": model or "fake-local-model",
            "input_tokens": 10,
            "output_tokens": 5 + trial,
        }


@pytest.mark.asyncio
async def test_system21_calls_model_for_each_temperature_and_saves_results(tmp_path) -> None:
    generation_client = FakeGenerationClient()
    run_file = tmp_path / "system21_runs.json"
    service = LearningSystemService(
        generation_client=generation_client,  # type: ignore[arg-type]
        system21_run_file=run_file,
    )

    executed = await service.execute_async(
        "system21",
        {
            "prompt": "返信文を作る",
            "temperatures": [0.1, 0.8],
            "trial_count": 2,
            "mode": "model",
            "task_type": "fixed",
            "learning_note": {"observation": "低い値は揃った", "decision": "0.1を候補にする", "risk_note": "追加評価が必要"},
        },
    )

    output = executed["result"]
    assert generation_client.requests == [
        ("返信文を作る", 0.1),
        ("返信文を作る", 0.1),
        ("返信文を作る", 0.8),
        ("返信文を作る", 0.8),
    ]
    assert output["generation_mode"] == "model"
    assert output["diff_summary"]["count"] == 4
    assert output["runs"][0]["model"] == "fake-local-model"
    assert output["learning_note"]["decision"] == "0.1を候補にする"
    assert output["saved"] is True
    assert run_file.exists()
    restored = LearningSystemService(system21_run_file=run_file)
    assert restored.list_runs("system21")[0]["run_id"] == executed["run_id"]


def test_system21_uses_explicit_mock_without_model_communication() -> None:
    service = LearningSystemService()

    output = service.execute(
        "system21",
        {"mode": "mock", "temperatures": [0.1, 0.7], "trial_count": 3},
    )["result"]

    assert output["generation_mode"] == "mock"
    assert output["diff_summary"]["count"] == 6
    assert output["diff_summary"]["per_temperature"][0]["unique_response_count"] == 1
    assert output["diff_summary"]["per_temperature"][1]["unique_response_count"] == 3
    assert all(run["model"] == "明示的なモック" for run in output["runs"])


@pytest.mark.parametrize(
    "payload",
    [
        {"prompt": "", "mode": "mock"},
        {"temperatures": [0.1], "mode": "mock"},
        {"temperatures": [0.1, 2.1], "mode": "mock"},
        {"temperatures": [0.1, 0.1], "mode": "mock"},
        {"trial_count": 0, "mode": "mock"},
        {"trial_count": 1.5, "mode": "mock"},
        {"mode": "unknown"},
        {"task_type": "unknown", "mode": "mock"},
        {"learning_note": [], "mode": "mock"},
    ],
)
def test_system21_rejects_invalid_input(payload: dict) -> None:
    service = LearningSystemService()

    with pytest.raises(ValueError):
        service.execute("system21", payload)


def test_system19_clamps_focus_token_index() -> None:
    service = LearningSystemService()

    result = service.execute(
        "system19",
        {"sentence": "猫 は 魚 を 食べる", "focus_token_index": 99},
    )

    tokens = result["result"]["tokens"]
    assert result["result"]["focus_token_index"] == len(tokens) - 1
    assert len(result["result"]["focus_relations"]) == len(tokens)


def test_system19_shows_pronoun_and_modifier_relationships() -> None:
    service = LearningSystemService()

    result = service.execute(
        "system19",
        {"sentence": "赤い 商品 は 売り切れた 。 それ を 顧客 が 予約 した", "focus_token_index": 5},
    )["result"]

    assert result["tokens"] == ["赤い", "商品", "は", "売り切れた", "。", "それ", "を", "顧客", "が", "予約", "した"]
    assert result["attention_matrix"][0][1] > result["attention_matrix"][0][2]
    assert result["attention_matrix"][5][1] > result["attention_matrix"][5][3]
    assert {reason["reason"] for reason in result["relation_reasons"]} == {
        "修飾語と、その直後にある語の関係",
        "指示語と、その前にある参照候補の関係",
    }
    assert "実際のTransformer" in result["score_note"]


def test_system19_saves_and_restores_run_history(tmp_path) -> None:
    run_file = tmp_path / "system19_runs.json"
    service = LearningSystemService(system19_run_file=run_file)

    executed = service.execute("system19")

    assert executed["result"]["saved"] is True
    assert executed["result"]["storage_status"] == "JSONファイルへ保存済み"
    assert run_file.exists()
    restored_service = LearningSystemService(system19_run_file=run_file)
    assert restored_service.list_runs("system19")[0]["run_id"] == executed["run_id"]


def test_system22_compares_fixed_questions_and_restores_saved_runs(tmp_path) -> None:
    run_file = tmp_path / "system22_runs.json"
    service = LearningSystemService(system22_run_file=run_file)

    result = service.execute(
        "system22",
        {
            "document": "返品は7日以内に申請する。返送品を確認して返金する。",
            "question_set": [
                {"question": "返品の期間は？", "expected_terms": ["返品", "7日以内"]},
                {"question": "返金の条件は？", "expected_terms": ["返送品", "確認", "返金"]},
            ],
            "chunk_configs": [
                {"id": "small", "label": "小", "chunk_size": 5, "overlap": 0},
                {"id": "large", "label": "大", "chunk_size": 30, "overlap": 4},
            ],
            "learning_note": {"observation": "大きい分割は根拠を保持", "decision": "大を選択", "risk_note": "検索範囲が広い"},
        },
    )["result"]

    assert result["comparison_count"] == 2
    assert [comparison["config_id"] for comparison in result["comparisons"]] == ["small", "large"]
    assert [item["question"] for item in result["comparisons"][0]["question_results"]] == [
        "返品の期間は？",
        "返金の条件は？",
    ]
    assert result["saved"] is True
    assert result["storage_status"] == "JSONファイルへ保存済み"
    assert result["comparisons"][0]["summary"]["chunk_count"] > result["comparisons"][1]["summary"]["chunk_count"]
    assert result["comparisons"][0]["question_results"][0]["evidence_split"] is True
    assert result["comparisons"][1]["question_results"][0]["expected_term_coverage"] == 1.0
    assert run_file.exists()

    restored = LearningSystemService(system22_run_file=run_file)
    assert restored.list_runs("system22")[0]["result"]["learning_note"]["decision"] == "大を選択"


def test_system22_rejects_overlap_equal_to_chunk_size() -> None:
    service = LearningSystemService()

    with pytest.raises(ValueError, match="overlap"):
        service.execute(
            "system22",
            {
                "chunk_configs": [
                    {"id": "invalid", "label": "不正", "chunk_size": 8, "overlap": 8},
                    {"id": "valid", "label": "正常", "chunk_size": 16, "overlap": 4},
                ]
            },
        )


class FakeRerankerEmbeddingClient:
    def __init__(self) -> None:
        self.requests: list[str] = []
        self._vectors = iter(
            [
                [1.0, 0.0],
                [1.0, 0.0],
                [0.8, 0.6],
                [0.0, 1.0],
            ]
        )

    async def embed(self, texts: list[str]) -> list[list[float]]:
        assert len(texts) == 1
        self.requests.append(texts[0])
        return [next(self._vectors)]


@pytest.mark.asyncio
async def test_system23_uses_embeddings_reranks_candidates_and_restores_runs(tmp_path) -> None:
    run_file = tmp_path / "system23_runs.json"
    embedding_client = FakeRerankerEmbeddingClient()
    service = LearningSystemService(
        embedding_client=embedding_client,  # type: ignore[arg-type]
        system23_run_file=run_file,
    )

    result = await service.execute_async(
        "system23",
        {
            "query": "返金条件",
            "documents": [
                {"id": "general", "text": "返金の一般案内です。"},
                {"id": "correct", "text": "返金条件は7日以内です。"},
                {"id": "shipping", "text": "配送状況を案内します。"},
            ],
            "initial_top_k": 3,
            "rerank_top_k": 2,
            "correct_document_id": "correct",
            "mode": "model",
            "learning_note": {"observation": "順位が改善", "decision": "採用候補", "risk_note": "遅延を確認"},
        },
    )

    output = result["result"]
    assert output["search_mode"] == "model"
    assert output["initial_ranking"][0]["document_id"] == "general"
    assert output["reranked_ranking"][0]["document_id"] == "correct"
    assert output["correct_document"]["rank_improvement"] == 1
    assert output["processing_summary"]["embedding_input_count"] == 4
    assert embedding_client.requests == [
        "返金条件",
        "返金の一般案内です。",
        "返金条件は7日以内です。",
        "配送状況を案内します。",
    ]
    assert output["saved"] is True
    assert run_file.exists()

    restored = LearningSystemService(system23_run_file=run_file)
    assert restored.list_runs("system23")[0]["result"]["learning_note"]["decision"] == "採用候補"


def test_system23_explicit_mock_keeps_result_structure() -> None:
    service = LearningSystemService()

    output = service.execute(
        "system23",
        {
            "query": "配送状況",
            "documents": [
                {"id": "shipping", "text": "配送状況は注文番号で確認します。"},
                {"id": "refund", "text": "返金条件は7日以内です。"},
            ],
            "initial_top_k": 2,
            "rerank_top_k": 1,
            "correct_document_id": "shipping",
            "mode": "mock",
        },
    )["result"]

    assert output["search_mode"] == "mock"
    assert output["search_mode_label"] == "明示的なモック"
    assert output["correct_document"]["initial_rank"] == 1
    assert output["processing_summary"]["embedding_input_count"] == 0


class FakeMultiModelClient:
    def __init__(self) -> None:
        self.requests: list[tuple[str, float, str | None]] = []

    async def generate_text_with_metadata(self, prompt: str, temperature: float, *, model: str | None = None) -> dict:
        self.requests.append((prompt, temperature, model))
        answer = "返品は7日以内で未使用の場合に受け付けます。" if model == "model-a" else "返品期限は7日以内です。"
        return {
            "text": answer,
            "model": model,
            "input_tokens": 20,
            "output_tokens": 10 if model == "model-a" else 6,
        }


@pytest.mark.asyncio
async def test_system24_calls_each_model_and_saves_comparison(tmp_path) -> None:
    generation_client = FakeMultiModelClient()
    run_file = tmp_path / "system24_runs.json"
    service = LearningSystemService(
        generation_client=generation_client,  # type: ignore[arg-type]
        system24_run_file=run_file,
    )

    executed = await service.execute_async(
        "system24",
        {
            "prompt": "返品条件を説明",
            "models": [
                {"id": "a", "model": "model-a", "label": "A", "input_cost_per_million": 1, "output_cost_per_million": 2},
                {"id": "b", "model": "model-b", "label": "B", "input_cost_per_million": 1, "output_cost_per_million": 2},
            ],
            "evaluation_rubric": {
                "required_terms": ["7日以内", "未使用"],
                "max_length": 100,
                "coverage_weight": 0.8,
                "conciseness_weight": 0.2,
            },
            "priority": "quality",
            "temperature": 0.2,
            "mode": "model",
            "learning_note": {"decision": "Aを候補にする"},
        },
    )

    output = executed["result"]
    assert generation_client.requests == [
        ("返品条件を説明", 0.2, "model-a"),
        ("返品条件を説明", 0.2, "model-b"),
    ]
    assert output["comparison_mode"] == "model"
    assert output["selected_model_id"] == "a"
    assert output["model_results"][0]["quality_score"] > output["model_results"][1]["quality_score"]
    assert output["model_results"][0]["estimated_cost"] == 0.00004
    assert output["saved"] is True
    assert run_file.exists()

    restored = LearningSystemService(system24_run_file=run_file)
    assert restored.list_runs("system24")[0]["result"]["learning_note"]["decision"] == "Aを候補にする"


def test_system24_explicit_mock_is_separate_from_model_results() -> None:
    service = LearningSystemService()

    output = service.execute("system24", {"mode": "mock", "priority": "quality"})["result"]

    assert output["comparison_mode"] == "mock"
    assert output["comparison_mode_label"] == "明示的なモック"
    assert output["selected_model_id"] == "quality-local"
    assert all(row["response_model"] == "明示的なモック" for row in output["model_results"])


class FakeOutputControlClient:
    def __init__(self) -> None:
        self.requests: list[tuple[str, float, str | None, int | None]] = []

    async def generate_text_with_metadata(
        self,
        prompt: str,
        temperature: float,
        *,
        model: str | None = None,
        max_tokens: int | None = None,
    ) -> dict:
        self.requests.append((prompt, temperature, model, max_tokens))
        trial = sum(1 for request in self.requests if request[1:] == (temperature, model, max_tokens))
        cutoff = max_tokens == 16
        return {
            "text": "" if cutoff else f"max={max_tokens}, temperature={temperature}, trial={trial}",
            "model": model,
            "input_tokens": 12,
            "output_tokens": max_tokens if cutoff else 20,
            "finish_reason": "length" if cutoff else "stop",
        }


@pytest.mark.asyncio
async def test_system25_calls_model_for_every_setting_and_saves_results(tmp_path) -> None:
    generation_client = FakeOutputControlClient()
    run_file = tmp_path / "system25_runs.json"
    service = LearningSystemService(
        generation_client=generation_client,  # type: ignore[arg-type]
        system25_run_file=run_file,
    )

    executed = await service.execute_async(
        "system25",
        {
            "prompt": "返品方法を詳しく説明",
            "model": "fake-model",
            "max_tokens_values": [16, 64],
            "temperatures": [0.2, 0.8],
            "trial_count": 2,
            "mode": "model",
            "learning_note": {"decision": "64を候補にする"},
        },
    )

    output = executed["result"]
    assert len(generation_client.requests) == 8
    assert output["generation_mode"] == "model"
    assert len(output["matrix_results"]) == 8
    assert all(row["cutoff"] for row in output["matrix_results"] if row["max_tokens"] == 16)
    assert all(row["output"] == "" for row in output["matrix_results"] if row["max_tokens"] == 16)
    assert all(not row["cutoff"] for row in output["matrix_results"] if row["max_tokens"] == 64)
    assert output["recommendation"]["max_tokens"] == 64
    assert output["saved"] is True
    assert run_file.exists()

    restored = LearningSystemService(system25_run_file=run_file)
    assert restored.list_runs("system25")[0]["result"]["learning_note"]["decision"] == "64を候補にする"


def test_system25_explicit_mock_reports_finish_reason() -> None:
    service = LearningSystemService()

    output = service.execute("system25", {"mode": "mock", "trial_count": 1})["result"]

    assert output["generation_mode"] == "mock"
    assert output["generation_mode_label"] == "明示的なモック"
    assert {row["finish_reason"] for row in output["matrix_results"]} <= {"length", "stop"}


def test_system25_reports_when_every_setting_is_cut_off() -> None:
    output = LearningSystemService._output_control_result(
        {
            "prompt": "返品方法を詳しく説明",
            "model": "reasoning-model",
            "max_tokens_values": [16, 48],
            "temperatures": [0.2],
            "trial_count": 1,
            "mode": "model",
            "learning_note": {},
        },
        [
            {
                "max_tokens": limit,
                "temperature": 0.2,
                "trial": 1,
                "output": "",
                "output_length": 0,
                "input_tokens": 12,
                "output_tokens": limit,
                "finish_reason": "length",
                "cutoff": True,
                "elapsed_ms": float(limit),
                "response_model": "reasoning-model",
            }
            for limit in (16, 48)
        ],
    )

    assert "すべての条件で途中切れ" in output["recommendation"]["reason"]
    assert "出力上限を増やして再比較" in output["recommendation"]["reason"]


class FakeQuantizationClient:
    def __init__(self) -> None:
        self.requests: list[tuple[str, float, str | None]] = []

    async def generate_text_with_metadata(self, prompt: str, temperature: float, *, model: str | None = None) -> dict:
        self.requests.append((prompt, temperature, model))
        answer = "返品期限は7日以内です。" if model == "model-q4" else "返品期限は7日以内で、未使用の商品は注文番号を添えて申請します。"
        return {
            "text": answer,
            "model": model,
            "input_tokens": 20,
            "output_tokens": 12,
        }


@pytest.mark.asyncio
async def test_system26_calls_each_quantized_model_and_saves_comparison(tmp_path) -> None:
    generation_client = FakeQuantizationClient()
    run_file = tmp_path / "system26_runs.json"
    service = LearningSystemService(
        generation_client=generation_client,  # type: ignore[arg-type]
        system26_run_file=run_file,
    )
    payload = {
        "prompt": "返品条件を説明",
        "quantization_profiles": [
            {"id": "q4", "model": "model-q4", "label": "Q4", "quantization": "4bit"},
            {"id": "q8", "model": "model-q8", "label": "Q8", "quantization": "8bit"},
        ],
        "runtime_metrics": [
            {"profile_id": "q4", "memory_mb": 8_000, "environment_note": "same-pc"},
            {"profile_id": "q8", "memory_mb": 14_000, "environment_note": "same-pc"},
        ],
        "evaluation_rubric": {
            "required_terms": ["7日以内", "未使用", "注文番号"],
            "max_length": 120,
            "coverage_weight": 0.8,
            "conciseness_weight": 0.2,
        },
        "selection_priority": "quality",
        "temperature": 0.2,
        "mode": "model",
        "learning_note": {"decision": "Q8を候補にする"},
    }

    executed = await service.execute_async("system26", payload)

    output = executed["result"]
    assert generation_client.requests == [("返品条件を説明", 0.2, "model-q4"), ("返品条件を説明", 0.2, "model-q8")]
    assert output["comparison_mode"] == "model"
    assert output["selected_profile_id"] == "q8"
    assert output["profile_results"][0]["memory_mb"] == 8_000
    assert output["profile_results"][1]["quality_score"] > output["profile_results"][0]["quality_score"]
    assert output["saved"] is True
    assert run_file.exists()

    restored = LearningSystemService(system26_run_file=run_file)
    assert restored.list_runs("system26")[0]["result"]["learning_note"]["decision"] == "Q8を候補にする"


def test_system26_explicit_mock_selects_profile_by_priority() -> None:
    service = LearningSystemService()

    quality = service.execute("system26", {"mode": "mock", "selection_priority": "quality"})["result"]
    memory = service.execute("system26", {"mode": "mock", "selection_priority": "memory"})["result"]

    assert quality["comparison_mode_label"] == "明示的なモック"
    assert quality["selected_profile_id"] == "q8"
    assert memory["selected_profile_id"] == "q4"
    assert all(row["response_model"] == "明示的なモック" for row in quality["profile_results"])


def test_system27_explicit_mock_prepares_images_and_scores_omissions() -> None:
    service = LearningSystemService()

    result = service.execute("system27")["result"]

    assert result["comparison_mode_label"] == "明示的なモック"
    assert [row["width"] for row in result["variant_results"]] == [320, 640, 1280]
    assert [row["accuracy"] for row in result["variant_results"]] == [0.333, 0.667, 1.0]
    assert all(row["image_data_url"].startswith("data:image/jpeg;base64,") for row in result["variant_results"])
    assert result["recommended_variant_id"] == "large"
    assert result["saved"] is False


class FakeVLMClient:
    def __init__(self) -> None:
        self.requests: list[tuple[str, str, str, int]] = []

    async def extract_json_with_metadata(
        self,
        system_prompt: str,
        user_prompt: str,
        image_urls: list[str],
        *,
        model: str | None = None,
    ) -> JSONExtractionResult:
        self.requests.append((system_prompt, user_prompt, model or "", len(image_urls[0])))
        answers = [
            "返品期限は7日以内です。",
            "返品期限は7日以内で、未使用の商品が対象です。",
            "返品期限は7日以内で、未使用の商品を注文番号とともに申請します。",
        ]
        answer = answers[len(self.requests) - 1]
        return JSONExtractionResult(
            data={"answer": answer, "observed_points": [], "omissions": []},
            raw_output=answer,
            input_tokens=24,
            output_tokens=12,
            response_model=model,
        )


@pytest.mark.asyncio
async def test_system27_sends_each_resized_image_to_vlm_and_restores_saved_run(tmp_path) -> None:
    vlm_client = FakeVLMClient()
    run_file = tmp_path / "system27_runs.json"
    service = LearningSystemService(
        vlm_client=vlm_client,  # type: ignore[arg-type]
        system27_run_file=run_file,
    )

    executed = await service.execute_async("system27", {"mode": "model", "model": "local-vlm"})

    output = executed["result"]
    assert len(vlm_client.requests) == 3
    assert all(request[2] == "local-vlm" for request in vlm_client.requests)
    assert len({request[3] for request in vlm_client.requests}) == 3
    assert output["comparison_mode"] == "model"
    assert output["variant_results"][2]["response_model"] == "local-vlm"
    assert output["variant_results"][2]["accuracy"] == 1.0
    assert output["saved"] is True
    assert run_file.exists()

    restored = LearningSystemService(system27_run_file=run_file)
    assert restored.list_runs("system27")[0]["result"]["recommended_variant_id"] == "large"


def test_system27_rejects_incomplete_mock_responses() -> None:
    service = LearningSystemService()

    with pytest.raises(ValueError, match="全画像ID"):
        service.execute("system27", {"mode": "mock", "mock_responses": {"small": "7日以内"}})


def test_system28_applies_selected_normalization_rules_and_restores_saved_run(tmp_path) -> None:
    run_file = tmp_path / "system28_runs.json"
    service = LearningSystemService(system28_run_file=run_file)

    executed = service.execute(
        "system28",
        {
            "ocr_text": "TEL O3-１２　 返晶",
            "rules": ["space", "zenkaku", "dictionary", "ocr_o_zero"],
            "correction_dictionary": {"返晶": "返品"},
        },
    )
    result = executed["result"]

    assert result["normalized_text"] == "TEL 03-12 返品"
    assert len(result["diffs"]) == 4
    assert result["diffs"][2]["confidence"] == "高"
    assert result["diffs"][3]["review_required"] is True
    assert result["review_status"] == "要確認"
    assert result["saved"] is True
    assert run_file.exists()

    restored = LearningSystemService(system28_run_file=run_file)
    assert restored.list_runs("system28")[0]["run_id"] == executed["run_id"]


def test_system28_rejects_unknown_rules_and_empty_dictionary() -> None:
    service = LearningSystemService()

    with pytest.raises(ValueError, match="未対応"):
        service.execute("system28", {"rules": ["unknown"]})
    with pytest.raises(ValueError, match="correction_dictionary"):
        service.execute("system28", {"rules": ["dictionary"], "correction_dictionary": {}})


def test_system29_filters_search_results_and_restores_saved_run(tmp_path) -> None:
    run_file = tmp_path / "system29_runs.json"
    service = LearningSystemService(system29_run_file=run_file)
    metadata = {
        "source": "rules.md",
        "page": 3,
        "section": "返品条件",
        "permission": "internal",
        "updated_at": "2026-08-20T09:00:00+09:00",
    }

    executed = service.execute(
        "system29",
        {
            "document": "返品期限は7日以内です。",
            "query": "返品期限",
            "metadata": metadata,
            "metadata_filter": {"permission": "internal"},
        },
    )
    result = executed["result"]

    assert result["chunks"][0]["metadata"] == metadata
    assert result["filter_result"]["matched"] is True
    assert result["search_results"][0]["citation"] == "rules.md / 3ページ / 返品条件"
    assert result["citation_preview"] == ["rules.md / 3ページ / 返品条件"]
    assert result["saved"] is True
    assert run_file.exists()

    restored = LearningSystemService(system29_run_file=run_file)
    assert restored.list_runs("system29")[0]["run_id"] == executed["run_id"]


def test_system29_excludes_a_chunk_that_does_not_match_metadata_filter() -> None:
    service = LearningSystemService()

    result = service.execute("system29", {"metadata_filter": {"permission": "public"}})["result"]

    assert result["filter_result"]["matched"] is False
    assert result["search_results"] == []
    assert result["citation_preview"] == []
    assert result["filter_result"]["rejected_reasons"] == ["permissionが指定値と一致しません。"]


def test_system29_rejects_missing_or_invalid_traceability_metadata() -> None:
    service = LearningSystemService()

    with pytest.raises(ValueError, match="必須項目"):
        service.execute("system29", {"metadata": {"source": "rules.md"}})
    with pytest.raises(ValueError, match="1以上の整数"):
        service.execute("system29", {"metadata": {**SYSTEMS["system29"].default_input["metadata"], "page": 0}})
    with pytest.raises(ValueError, match="未対応"):
        service.execute("system29", {"metadata_filter": {"unknown": "value"}})


def test_system30_detects_exact_and_version_candidates_and_restores_saved_run(tmp_path) -> None:
    run_file = tmp_path / "system30_runs.json"
    service = LearningSystemService(system30_run_file=run_file)

    executed = service.execute("system30")
    result = executed["result"]

    assert len(result["candidate_pairs"]) == 6
    assert result["candidate_count"] == 3
    assert result["exact_match_count"] == 1
    assert result["similar_match_count"] == 2
    assert set(result["duplicate_groups"][0]["document_ids"]) == {
        "returns-v1",
        "returns-v2",
        "returns-copy",
    }
    assert result["resolution"]["preferred_document_id"] == "returns-v2"
    assert next(row for row in result["decision_records"] if row["document_id"] == "returns-copy")["decision"] == "除外"
    assert result["search_bias_preview"][0]["duplicate_group"] == "group-1"
    assert result["saved"] is True
    assert run_file.exists()

    restored = LearningSystemService(system30_run_file=run_file)
    assert restored.list_runs("system30")[0]["run_id"] == executed["run_id"]


def test_system30_changes_candidates_when_threshold_is_raised() -> None:
    service = LearningSystemService()

    default_result = service.execute("system30")["result"]
    strict_result = service.execute(
        "system30",
        {
            "similarity_threshold": 0.99,
            "resolution": {"action": "review", "excluded_document_ids": []},
        },
    )["result"]

    assert default_result["candidate_count"] == 3
    assert strict_result["candidate_count"] == 1
    assert strict_result["candidate_pairs"][0]["match_type"] == "候補外"
    assert strict_result["candidate_pairs"][1]["match_type"] == "完全一致"


def test_system30_accepts_string_documents_for_backward_compatibility() -> None:
    service = LearningSystemService()

    result = service.execute(
        "system30",
        {
            "documents": ["返品条件", "返品条件", "配送条件"],
            "similarity_threshold": 0.9,
            "resolution": {"action": "review", "excluded_document_ids": []},
        },
    )["result"]

    assert len(result["candidate_pairs"]) == 3
    assert result["candidate_pairs"][0]["duplicate_candidate"] is True
    assert result["similarity_threshold"] == 0.9


def test_system30_rejects_invalid_documents_threshold_and_resolution() -> None:
    service = LearningSystemService()

    with pytest.raises(ValueError, match="2件以上20件以下"):
        service.execute("system30", {"documents": ["1件だけ"]})
    with pytest.raises(ValueError, match="重複しない"):
        service.execute(
            "system30",
            {"documents": [{"document_id": "same", "text": "A"}, {"document_id": "same", "text": "B"}]},
        )
    with pytest.raises(ValueError, match="0から1の範囲"):
        service.execute("system30", {"similarity_threshold": 1.1})
    with pytest.raises(ValueError, match="存在しないdocument_id"):
        service.execute("system30", {"resolution": {"action": "exclude", "excluded_document_ids": ["missing"]}})


def test_system31_builds_approved_ground_truth_and_restores_saved_run(tmp_path) -> None:
    run_file = tmp_path / "system31_runs.json"
    service = LearningSystemService(system31_run_file=run_file)

    executed = service.execute("system31")
    result = executed["result"]

    assert result["dataset_name"] == "support-ground-truth-v1"
    assert result["ground_truth_case"]["question"] == "返品期限は？"
    assert result["ground_truth_case"]["evidence"][0]["source_exists"] is True
    assert result["ground_truth_case"]["evidence"][0]["quote_found"] is True
    assert result["rubric_weight_total"] == 1.0
    assert result["review_status"] == "approved"
    assert result["ready_for_evaluation"] is True
    assert result["validation_issues"] == []
    assert result["saved"] is True
    assert run_file.exists()

    restored = LearningSystemService(system31_run_file=run_file)
    assert restored.list_runs("system31")[0]["run_id"] == executed["run_id"]


def test_system31_reports_missing_ground_truth_fields() -> None:
    service = LearningSystemService()

    result = service.execute(
        "system31",
        {
            "question": "返品期限は？",
            "expected_answer": "7日以内",
            "evidence": [],
            "review": {"status": "draft", "reviewer": "", "comment": "根拠を追加する。"},
        },
    )["result"]

    assert result["review_status"] == "draft"
    assert result["ready_for_evaluation"] is False
    assert result["validation_issues"] == ["根拠が入力されていません。"]


def test_system31_rejects_unmatched_evidence_from_evaluation_use() -> None:
    service = LearningSystemService()

    result = service.execute(
        "system31",
        {
            "evidence": [{"document_id": "returns-policy", "quote": "返品期限は30日以内です。"}],
            "review": {"status": "rejected", "reviewer": "レビュー担当", "comment": "原文と一致しない。"},
        },
    )["result"]

    assert result["review_status"] == "rejected"
    assert result["ready_for_evaluation"] is False
    assert result["ground_truth_case"]["evidence"][0]["quote_found"] is False
    assert result["validation_issues"] == ["evidence-1の引用文が根拠文書に存在しません。"]


def test_system31_accepts_string_evidence_for_backward_compatibility() -> None:
    service = LearningSystemService()

    result = service.execute(
        "system31",
        {"evidence": ["返品は商品到着後7日以内に申請してください。"]},
    )["result"]

    assert result["ground_truth_case"]["evidence"][0]["document_id"] == "returns-policy"
    assert result["ground_truth_case"]["evidence"][0]["quote_found"] is True
    assert result["ready_for_evaluation"] is True


def test_system31_rejects_invalid_rubric_and_review() -> None:
    service = LearningSystemService()

    with pytest.raises(ValueError, match="0から1の範囲"):
        service.execute(
            "system31",
            {"evaluation_viewpoints": [{"viewpoint_id": "invalid", "label": "不正", "description": "不正", "weight": 1.5}]},
        )
    with pytest.raises(ValueError, match="draft、approved、rejected"):
        service.execute("system31", {"review": {"status": "unknown"}})
    with pytest.raises(ValueError, match="根拠の配列"):
        service.execute("system31", {"evidence": "配列ではない"})


def test_system32_classifies_failures_and_restores_saved_run(tmp_path) -> None:
    run_file = tmp_path / "system32_runs.json"
    service = LearningSystemService(system32_run_file=run_file)

    executed = service.execute("system32")
    result = executed["result"]

    assert result["dataset_name"] == "support-rag-evaluation-v1"
    assert result["case_count"] == 3
    assert result["metrics"] == {
        "case_count": 3,
        "retrieval_success_rate": 0.667,
        "generation_success_rate": 0.667,
        "average_answer_score": 0.667,
        "retrieval_failure_count": 1,
        "generation_failure_count": 1,
    }
    assert [row["failure_type"] for row in result["case_results"]] == [
        "none",
        "retrieval_failure",
        "generation_failure",
    ]
    assert result["saved"] is True
    assert run_file.exists()

    restored = LearningSystemService(system32_run_file=run_file)
    assert restored.list_runs("system32")[0]["run_id"] == executed["run_id"]


def test_system32_compares_the_same_dataset_with_the_previous_run() -> None:
    service = LearningSystemService()
    service.execute("system32")
    default_input = service.get_system("system32").default_input
    regressed_cases = [
        {**case, "retrieval_results": ["unrelated-1", "unrelated-2", "unrelated-3"]}
        for case in default_input["ground_truth_cases"]
    ]

    result = service.execute(
        "system32",
        {"run_label": "retrieval-regression", "ground_truth_cases": regressed_cases},
    )["result"]

    assert result["metrics"]["retrieval_success_rate"] == 0.0
    assert result["regression_diff"]["has_previous_run"] is True
    assert result["regression_diff"]["previous_run_label"] == "baseline"
    assert result["regression_diff"]["metric_deltas"]["retrieval_success_rate"] == -0.667
    assert "retrieval_success_rate" in result["regression_diff"]["regressed_metrics"]


def test_system32_does_not_compare_a_run_with_different_rag_settings() -> None:
    service = LearningSystemService()
    service.execute("system32")

    result = service.execute(
        "system32",
        {
            "run_label": "different-retriever",
            "rag_config": {
                "retriever_version": "support-search-v2",
                "generator_version": "support-answer-v1",
                "prompt_version": "support-prompt-v1",
                "top_k": 3,
            },
        },
    )["result"]

    assert result["regression_diff"]["has_previous_run"] is False
    assert result["regression_diff"]["previous_run_id"] is None


def test_system32_rejects_invalid_evaluation_set() -> None:
    service = LearningSystemService()

    with pytest.raises(ValueError, match="1件以上100件以下"):
        service.execute("system32", {"ground_truth_cases": []})
    with pytest.raises(ValueError, match="重複しない"):
        service.execute(
            "system32",
            {
                "ground_truth_cases": [
                    {
                        "case_id": "duplicate",
                        "question": "質問1",
                        "expected_answer": "回答1",
                        "expected_evidence_ids": ["doc-1"],
                    },
                    {
                        "case_id": "duplicate",
                        "question": "質問2",
                        "expected_answer": "回答2",
                        "expected_evidence_ids": ["doc-2"],
                    },
                ],
            },
        )
    with pytest.raises(ValueError, match="1以上の整数"):
        service.execute("system32", {"rag_config": {"top_k": 0}})


def test_system33_returns_ranked_retrieval_metrics() -> None:
    service = LearningSystemService()

    result = service.execute(
        "system33",
        {
            "expected_evidence": ["doc-1", "doc-4"],
            "retrieval_results": ["doc-3", "doc-1", "doc-2", "doc-4"],
            "top_k": 3,
        },
    )["result"]

    assert result["hit_at_k"] == 1.0
    assert result["recall_at_k"] == {"k": 3, "recall": 0.5}
    assert result["precision_at_k"] == 0.333
    assert result["reciprocal_rank"] == 0.5
    assert result["missing_evidence"] == ["doc-4"]


def test_system33_evaluates_query_cases_compares_chunks_and_restores_saved_runs(tmp_path) -> None:
    run_file = tmp_path / "system33_runs.json"
    service = LearningSystemService(system33_run_file=run_file)

    baseline = service.execute("system33")
    baseline_result = baseline["result"]

    assert baseline_result["case_count"] == 3
    assert baseline_result["metrics"] == {
        "case_count": 3,
        "hit_rate": 1.0,
        "average_recall_at_k": 0.833,
        "average_precision_at_k": 0.333,
        "mean_reciprocal_rank": 0.778,
    }
    assert baseline_result["failure_cases"][0]["failure_type"] == "partial_recall"
    assert baseline_result["saved"] is True
    assert run_file.exists()

    improved = service.execute(
        "system33",
        {
            "chunk_setting": "250文字・50文字重複",
            "top_k": 2,
            "query_cases": [
                {
                    "case_id": "case-returns",
                    "question": "返品期限は？",
                    "expected_evidence": ["returns-policy"],
                    "retrieval_results": ["returns-policy", "shipping-guide"],
                },
                {
                    "case_id": "case-shipping",
                    "question": "通常配送の日数は？",
                    "expected_evidence": ["shipping-guide"],
                    "retrieval_results": ["shipping-guide", "payment-faq"],
                },
                {
                    "case_id": "case-payment",
                    "question": "利用できる支払方法は？",
                    "expected_evidence": ["payment-faq", "card-guide"],
                    "retrieval_results": ["payment-faq", "card-guide", "account-guide"],
                },
            ],
        },
    )["result"]

    assert improved["metrics"]["average_recall_at_k"] == 1.0
    assert improved["failure_cases"] == []
    assert improved["chunk_comparison"]["has_previous_run"] is True
    assert improved["chunk_comparison"]["previous_chunk_setting"] == "500文字・100文字重複"
    assert improved["chunk_comparison"]["metric_deltas"]["average_recall_at_k"] == 0.167

    restored = LearningSystemService(system33_run_file=run_file)
    assert restored.list_runs("system33")[0]["result"]["chunk_setting"] == "250文字・50文字重複"


def test_system33_rejects_invalid_cases_and_top_k() -> None:
    service = LearningSystemService()

    with pytest.raises(ValueError, match="1以上の整数"):
        service.execute("system33", {"top_k": 0})
    with pytest.raises(ValueError, match="expected_evidenceを1件以上"):
        service.execute(
            "system33",
            {
                "query_cases": [{
                    "case_id": "missing-evidence",
                    "question": "質問",
                    "expected_evidence": [],
                    "retrieval_results": ["doc-1"],
                }]
            },
        )


def test_system34_evaluates_four_viewpoints_and_restores_saved_runs(tmp_path) -> None:
    run_file = tmp_path / "system34_runs.json"
    service = LearningSystemService(system34_run_file=run_file)

    run = service.execute("system34")
    result = run["result"]

    assert result["score_breakdown"] == {
        "correctness": 1.0,
        "groundedness": 1.0,
        "completeness": 1.0,
        "conciseness": 1.0,
    }
    assert result["overall_score"] == 1.0
    assert result["classifications"] == [{
        "code": "acceptable",
        "label": "要件を満たす回答",
        "reason": "必要な回答要素が根拠付きで簡潔に含まれています。",
    }]
    assert result["saved"] is True
    assert run_file.exists()

    restored_service = LearningSystemService(system34_run_file=run_file)
    assert restored_service.list_runs("system34")[0]["run_id"] == run["run_id"]


def test_system34_classifies_insufficient_unsupported_and_excessive_answers() -> None:
    service = LearningSystemService()

    insufficient = service.execute(
        "system34",
        {
            "generated_answer": "返品は商品到着後7日以内で受け付けます。",
            "answer_claims": [{
                "claim_id": "claim-deadline",
                "text": "返品は商品到着後7日以内で受け付けます。",
                "evidence_ids": ["returns-policy"],
                "expected_point_ids": ["deadline"],
                "support_terms": ["7日以内"],
            }],
        },
    )["result"]
    assert insufficient["score_breakdown"] == {
        "correctness": 1.0,
        "groundedness": 1.0,
        "completeness": 0.5,
        "conciseness": 1.0,
    }
    assert [row["label"] for row in insufficient["missing_points"]] == ["返品条件"]
    assert [row["code"] for row in insufficient["classifications"]] == ["insufficient"]

    unsupported = service.execute(
        "system34",
        {
            "generated_answer": "返品は商品到着後7日以内で受け付けます。商品が未使用の場合に限ります。返送料は無料です。",
            "answer_claims": [
                *service.get_system("system34").default_input["answer_claims"],
                {
                    "claim_id": "claim-shipping-fee",
                    "text": "返送料は無料です。",
                    "evidence_ids": [],
                    "expected_point_ids": [],
                    "support_terms": ["返送料は無料"],
                },
            ],
        },
    )["result"]
    assert unsupported["score_breakdown"]["groundedness"] == 0.667
    assert [row["claim_id"] for row in unsupported["unsupported_assertions"]] == ["claim-shipping-fee"]
    assert [row["code"] for row in unsupported["classifications"]] == ["unsupported"]

    excessive = service.execute(
        "system34",
        {
            "evidence": [
                *service.get_system("system34").default_input["evidence"],
                {"evidence_id": "packing-guide", "text": "返送には購入時の箱を使用できます。"},
            ],
            "generated_answer": "返品は商品到着後7日以内で受け付けます。商品が未使用の場合に限ります。返送には購入時の箱を使用できます。",
            "answer_claims": [
                *service.get_system("system34").default_input["answer_claims"],
                {
                    "claim_id": "claim-packing",
                    "text": "返送には購入時の箱を使用できます。",
                    "evidence_ids": ["packing-guide"],
                    "expected_point_ids": [],
                    "support_terms": ["購入時の箱"],
                },
            ],
        },
    )["result"]
    assert excessive["score_breakdown"]["conciseness"] == 0.667
    assert [row["claim_id"] for row in excessive["excessive_claims"]] == ["claim-packing"]
    assert [row["code"] for row in excessive["classifications"]] == ["excessive"]


def test_system35_compares_cases_records_regression_and_restores_saved_runs(tmp_path) -> None:
    run_file = tmp_path / "system35_runs.json"
    service = LearningSystemService(system35_run_file=run_file)

    run = service.execute("system35")
    result = run["result"]

    assert result["winner"] == "B"
    assert result["average_scores"] == {"A": 0.708, "B": 0.8}
    assert result["score_difference_b_minus_a"] == 0.092
    assert result["case_count"] == 3
    assert [row["case_id"] for row in result["improved_cases"]] == ["case-returns", "case-shipping"]
    assert [row["case_id"] for row in result["regressed_cases"]] == ["case-support-hours"]
    assert result["adoption_record"]["matches_recommendation"] is True
    assert result["saved"] is True
    assert run_file.exists()

    restored_service = LearningSystemService(system35_run_file=run_file)
    assert restored_service.list_runs("system35")[0]["run_id"] == run["run_id"]


def test_system35_can_select_prompt_a_and_hold_a_tie() -> None:
    service = LearningSystemService()
    prompt_a_sample = service.get_system("system35").samples[1]["input"]
    tie_sample = service.get_system("system35").samples[2]["input"]

    prompt_a_result = service.execute("system35", prompt_a_sample)["result"]
    tie_result = service.execute("system35", tie_sample)["result"]

    assert prompt_a_result["winner"] == "A"
    assert prompt_a_result["regressed_cases"][0]["case_id"] == "case-returns"
    assert prompt_a_result["adoption_record"]["selected_variant"] == "A"
    assert tie_result["winner"] == "同点"
    assert tie_result["unchanged_cases"][0]["case_id"] == "case-shipping"
    assert tie_result["adoption_record"]["recommended_variant"] == "保留"


def test_system35_rejects_invalid_conditions_cases_and_adoption_record() -> None:
    service = LearningSystemService()

    with pytest.raises(ValueError, match="合計は1.0"):
        service.execute(
            "system35",
            {"scoring_weights": {"correctness": 1.0, "groundedness": 1.0, "completeness": 1.0, "conciseness": 1.0}},
        )
    with pytest.raises(ValueError, match="evaluation_casesを1件以上"):
        service.execute("system35", {"evaluation_cases": []})
    with pytest.raises(ValueError, match="A、B、保留"):
        service.execute(
            "system35",
            {"adoption_record": {"selected_variant": "C", "reason": "理由", "risk_note": "注意"}},
        )


def test_system36_saves_complete_trace_and_restores_history(tmp_path) -> None:
    run_file = tmp_path / "system36_runs.json"
    service = LearningSystemService(system36_run_file=run_file)

    run = service.execute(
        "system36",
        {
            "trace_name": "返品期限回答の記録",
            "user_input": "返品期限は？",
            "retrieved_context": ["返品条件は7日以内"],
            "model_config": {"model": "mock-model", "temperature": 0.2},
            "prompt": "根拠に基づいて回答してください。",
            "prompt_version": "support-v1",
            "output": "7日以内です",
            "evaluation": {"evaluation_id": "answer-eval-001", "status": "passed", "score": 1.0},
        },
    )
    result = run["result"]

    assert result["trace_id"].startswith("trace-")
    assert result["missing_fields"] == []
    assert result["replay_ready"] is True
    assert result["evaluation_link"]["evaluation_id"] == "answer-eval-001"
    assert result["saved"] is True
    assert result["recorded_at"] == run["created_at"]
    assert run_file.exists()

    restored_service = LearningSystemService(system36_run_file=run_file)
    assert restored_service.list_runs("system36")[0]["result"]["trace_id"] == result["trace_id"]


def test_system36_reports_missing_fields_and_masks_sensitive_values(tmp_path) -> None:
    run_file = tmp_path / "system36_runs.json"
    service = LearningSystemService(system36_run_file=run_file)
    missing_sample = service.get_system("system36").samples[1]["input"]
    masked_sample = service.get_system("system36").samples[2]["input"]

    missing = service.execute("system36", missing_sample)["result"]
    masked = service.execute("system36", masked_sample)["result"]

    assert missing["replay_ready"] is False
    assert missing["missing_fields"] == ["prompt", "prompt_version", "evaluation"]
    assert masked["masking"]["masked_value_count"] == 3
    assert masked["masking"]["protected_fields"] == ["user_input", "retrieved_context", "output"]
    assert "customer@example.com" not in json.dumps(masked, ensure_ascii=False)
    assert "customer@example.com" not in run_file.read_text(encoding="utf-8")
    assert "[MASKED]" in masked["trace_record"]["user_input"]


def test_system36_rejects_invalid_trace_structures() -> None:
    service = LearningSystemService()

    with pytest.raises(ValueError, match="retrieved_contextは配列"):
        service.execute("system36", {"retrieved_context": "返品条件は7日以内"})
    with pytest.raises(ValueError, match="model_configはJSONオブジェクト"):
        service.execute("system36", {"model_config": "mock-model"})
    with pytest.raises(ValueError, match="masking_policy.terms"):
        service.execute("system36", {"masking_policy": {"enabled": True, "replacement": "[MASKED]", "terms": "secret"}})
