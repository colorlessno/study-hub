from __future__ import annotations

import json
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from studyai.app import create_app
from studyai.systems.enterprise_ai.catalog import SYSTEMS
from studyai.systems.enterprise_ai.service import (
    EnterpriseAiService,
    EnterpriseAiUpstreamError,
    enterprise_ai_service,
)


@pytest.mark.parametrize("system_id", sorted(SYSTEMS))
def test_enterprise_ai_system_executes_with_default_input(system_id: str) -> None:
    service = EnterpriseAiService()

    result = service.execute(system_id)

    assert result["system_id"] == system_id
    assert result["run_id"].startswith(f"{system_id}-")
    assert result["state"] in SYSTEMS[system_id].state_flow
    assert result["result"]["recommendations"]
    assert result["audit_log"]
    assert result["kpi_snapshot"]
    if not result["result"]["risk_flags"]:
        assert result["state"] not in {"escalated", "flagged", "reviewed"}
    assert service.list_runs(system_id)[0]["run_id"] == result["run_id"]


@pytest.mark.parametrize("system_id", sorted(SYSTEMS))
def test_enterprise_ai_api_routes_are_registered(system_id: str) -> None:
    client = TestClient(create_app())

    metadata = client.get(f"/api/{system_id}/metadata")
    executed = client.post(f"/api/{system_id}/execute", json={"input": {}, "mode": "mock"})
    runs = client.get(f"/api/{system_id}/runs")

    assert metadata.status_code == 200
    assert metadata.json()["system_id"] == system_id
    assert executed.status_code == 200
    assert executed.json()["system_id"] == system_id
    assert runs.status_code == 200
    assert runs.json()["runs"]


def test_enterprise_ai_masks_secret_like_values() -> None:
    service = EnterpriseAiService()

    result = service.execute("system37", {"input": {"api_key": "raw-key", "nested": {"password": "raw-password"}}})

    assert result["input"]["api_key"] == "***MASKED***"
    assert result["input"]["nested"]["password"] == "***MASKED***"


def test_enterprise_ai_lmstudio_mode_reports_failure_without_mock_fallback() -> None:
    def unavailable(*_args: object) -> dict:
        raise ValueError("LM Studio unavailable")

    service = EnterpriseAiService(lmstudio_requester=unavailable)

    with pytest.raises(EnterpriseAiUpstreamError, match="mockは明示的に選択した場合だけ"):
        service.execute("system44", {"mode": "lmstudio"})

    assert service.list_runs("system44") == []


def test_enterprise_ai_api_returns_bad_gateway_when_lmstudio_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    def unavailable(*_args: object) -> dict:
        raise ValueError("LM Studio unavailable")

    monkeypatch.setattr(enterprise_ai_service, "_lmstudio_requester", unavailable)
    response = TestClient(create_app()).post("/api/system44/execute", json={"input": {}, "mode": "lmstudio"})

    assert response.status_code == 502
    assert response.json()["detail"]["error_code"] == "system44_lmstudio_failed"


def test_enterprise_ai_lmstudio_mode_uses_openai_compatible_result() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content)
        assert request.url.path.endswith("/chat/completions")
        assert payload["messages"][0]["role"] == "system"
        assert payload["messages"][1]["role"] == "user"
        return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps({
            "summary": "LM Studioで候補を比較しました。",
            "state": "confirming",
            "recommendations": [{"candidate": "plan-a"}],
            "explanations": ["希望条件と空き枠を比較しました。"],
            "risk_flags": [],
        }, ensure_ascii=False)}}]})

    service = EnterpriseAiService(http_transport=httpx.MockTransport(handler))

    result = service.execute("system37", {"mode": "lmstudio"})

    assert result["state"] == "executed"
    assert result["result"]["selected_candidate"]["id"] == "plan-a"
    assert result["result"]["ai_assessment"]["summary"] == "LM Studioで候補を比較しました。"
    assert result["result"]["ai_assessment"]["recommendations"] == [{"candidate": "plan-a"}]
    assert any("LM Studio" in entry["reason"] for entry in result["audit_log"])


def test_system37_asks_for_missing_conditions_and_blocks_unconfirmed_execution() -> None:
    service = EnterpriseAiService()
    missing = service.execute("system37", {"input": {"request_conditions": {"route": "", "date": "2026-05-15", "budget": 18000}}})
    unconfirmed = service.execute("system37", {"input": {"user_confirmation": False}})

    assert missing["state"] == "hearing"
    assert missing["result"]["recommendations"][0]["type"] == "question"
    assert missing["result"]["recommendations"][0]["field"] == "route"
    assert "条件不足" in missing["result"]["risk_flags"]
    assert unconfirmed["state"] == "confirming"
    assert "実行前確認待ち" in unconfirmed["result"]["risk_flags"]


def test_system37_executes_changes_cancels_and_records_each_result() -> None:
    service = EnterpriseAiService()

    executed = service.execute("system37")
    changed = service.execute("system37", {"input": {"transaction_request": {"action": "change", "candidate_id": "plan-a"}}})
    cancelled = service.execute("system37", {"input": {"transaction_request": {"action": "cancel", "candidate_id": "plan-a"}}})

    assert executed["state"] == "executed"
    assert changed["state"] == "changed"
    assert cancelled["state"] == "cancelled"
    assert executed["result"]["transaction_record"]["recorded"] is True
    assert changed["result"]["transaction_record"]["status"] == "changed"
    assert cancelled["result"]["transaction_record"]["status"] == "cancelled"
    assert any(entry["action"] == "transaction_executed" for entry in executed["audit_log"])
    assert any(entry["action"] == "transaction_changed" for entry in changed["audit_log"])
    assert any(entry["action"] == "transaction_cancelled" for entry in cancelled["audit_log"])


def test_system37_persists_run_history_and_restores_it_after_restart(tmp_path: Path) -> None:
    run_file = tmp_path / "enterprise_ai" / "system37_runs.json"
    service = EnterpriseAiService(system37_run_file=run_file)

    executed = service.execute("system37")

    assert run_file.exists()
    assert executed["storage"] == {
        "saved": True,
        "format": "json",
        "retention_limit": 20,
        "retained_runs": 1,
    }
    assert json.loads(run_file.read_text(encoding="utf-8"))[0]["run_id"] == executed["run_id"]

    restarted_service = EnterpriseAiService(system37_run_file=run_file)
    restored = restarted_service.list_runs("system37")

    assert restored[0]["run_id"] == executed["run_id"]
    assert restored[0]["result"]["transaction_record"]["status"] == "executed"
    assert restored[0]["kpi_snapshot"]["execution_success_rate"] == 1.0


def test_system38_shows_score_breakdown_and_excludes_out_of_stock_items() -> None:
    service = EnterpriseAiService()
    result = service.execute("system38", {"input": {"item_catalog": [
        {"id": "in-stock", "tags": ["coffee"], "freshness": 0.8, "status": "in_stock"},
        {"id": "sold-out", "tags": ["coffee"], "freshness": 1.0, "status": "out_of_stock"},
    ]}})

    recommendations = result["result"]["recommendations"]
    assert [item["id"] for item in recommendations] == ["in-stock"]
    assert recommendations[0]["interest_matches"] == ["coffee"]
    assert recommendations[0]["score"] == 1.8
    assert result["result"]["variant_assignment"]["variant"] in {"control", "personalized"}
    assert result["result"]["reaction_log"]["recorded"] is True
    assert service.list_runs("system38")[0]["result"]["reaction_log"] == result["result"]["reaction_log"]


def test_system38_persists_recommendation_and_reaction_after_restart(tmp_path: Path) -> None:
    run_file = tmp_path / "enterprise_ai" / "system38_runs.json"
    service = EnterpriseAiService(system38_run_file=run_file)

    executed = service.execute("system38")

    assert executed["storage"] == {
        "saved": True,
        "format": "json",
        "retention_limit": 20,
        "retained_runs": 1,
    }
    restarted_service = EnterpriseAiService(system38_run_file=run_file)
    restored = restarted_service.list_runs("system38")
    assert restored[0]["run_id"] == executed["run_id"]
    assert restored[0]["result"]["recommendations"] == executed["result"]["recommendations"]
    assert restored[0]["result"]["reaction_log"] == executed["result"]["reaction_log"]


def test_system39_separates_answer_from_protected_business_action() -> None:
    service = EnterpriseAiService()
    result = service.execute("system39", {"input": {"customer_context": {"contract": "standard", "authenticated": False}}})

    recommendation = result["result"]["recommendations"][0]
    assert recommendation["answer"]
    assert recommendation["requested_action"] == "update_address"
    assert recommendation["action_allowed"] is False
    assert recommendation["next_action"] == "escalate"
    assert result["state"] == "escalated"
    assert result["result"]["support_case"]["procedure_result"]["status"] == "blocked"
    assert result["result"]["support_case"]["ticket"]["status"] == "handoff_required"
    assert result["result"]["support_case"]["handoff_summary"]["required"] is True
    assert any(entry["action"] == "support_handoff_recorded" for entry in result["audit_log"])


def test_system39_records_an_accepted_procedure_and_support_ticket() -> None:
    service = EnterpriseAiService()

    result = service.execute("system39")

    business_action = result["result"]["business_action"]
    support_case = result["result"]["support_case"]
    assert business_action["action_allowed"] is True
    assert business_action["next_action"] == "update_address"
    assert support_case["procedure_result"]["status"] == "accepted"
    assert support_case["procedure_result"]["recorded"] is True
    assert support_case["ticket"]["status"] == "resolved"
    assert service.list_runs("system39")[0]["result"]["support_case"] == support_case


def test_system39_persists_support_case_and_restores_it_after_restart(tmp_path: Path) -> None:
    run_file = tmp_path / "enterprise_ai" / "system39_runs.json"
    service = EnterpriseAiService(system39_run_file=run_file)

    executed = service.execute("system39")

    assert executed["storage"] == {
        "saved": True,
        "format": "json",
        "retention_limit": 20,
        "retained_runs": 1,
    }
    restarted_service = EnterpriseAiService(system39_run_file=run_file)
    restored = restarted_service.list_runs("system39")
    assert restored[0]["run_id"] == executed["run_id"]
    assert restored[0]["result"]["support_case"] == executed["result"]["support_case"]
    assert restored[0]["audit_log"] == executed["audit_log"]


def test_system39_blocks_an_address_change_after_shipment() -> None:
    service = EnterpriseAiService()

    result = service.execute("system39", {"input": {"order_info": {
        "order_id": "order-002",
        "shipping_status": "shipped",
    }}})

    assert result["result"]["business_action"]["action_allowed"] is False
    assert "出荷後の住所変更" in result["result"]["risk_flags"]
    assert result["result"]["support_case"]["procedure_result"]["status"] == "blocked"


def test_system40_separates_forecast_error_from_inventory_risk_and_honors_capacity() -> None:
    service = EnterpriseAiService()
    result = service.execute("system40")

    recommendation = result["result"]["recommendations"][0]
    assert recommendation["base_forecast"] == pytest.approx(31.67, abs=0.01)
    assert recommendation["forecast"] == pytest.approx(45.29, abs=0.01)
    assert recommendation["forecast_error_rate"] is not None
    assert recommendation["target_stock"] <= recommendation["shelf_capacity"]
    assert "欠品" in result["result"]["risk_flags"]
    assert result["state"] == "proposed"
    assert result["result"]["replenishment_proposal"]["approval_status"] == "pending"
    assert result["result"]["replenishment_proposal"]["order_candidate_recorded"] is False


def test_system40_records_an_order_candidate_only_after_human_approval() -> None:
    service = EnterpriseAiService()

    result = service.execute("system40", {"input": {"approval": {
        "status": "approved",
        "approver": "inventory-manager",
    }}})

    proposal = result["result"]["replenishment_proposal"]
    assert result["state"] == "approved"
    assert proposal["approver"] == "inventory-manager"
    assert proposal["order_candidate_recorded"] is True
    assert any(entry["action"] == "replenishment_approval_recorded" for entry in result["audit_log"])
    assert any(entry["action"] == "order_candidate_recorded" for entry in result["audit_log"])
    assert service.list_runs("system40")[0]["result"]["replenishment_proposal"] == proposal


def test_system40_persists_replenishment_proposal_and_restores_it_after_restart(tmp_path: Path) -> None:
    run_file = tmp_path / "enterprise_ai" / "system40_runs.json"
    service = EnterpriseAiService(system40_run_file=run_file)

    executed = service.execute("system40", {"input": {"approval": {
        "status": "approved",
        "approver": "inventory-manager",
    }}})

    assert executed["storage"] == {
        "saved": True,
        "format": "json",
        "retention_limit": 20,
        "retained_runs": 1,
    }
    restarted_service = EnterpriseAiService(system40_run_file=run_file)
    restored = restarted_service.list_runs("system40")
    assert restored[0]["run_id"] == executed["run_id"]
    assert restored[0]["result"]["replenishment_proposal"] == executed["result"]["replenishment_proposal"]
    assert restored[0]["audit_log"] == executed["audit_log"]


def test_system41_combines_image_ocr_master_and_sensor_evidence() -> None:
    service = EnterpriseAiService()
    default = service.execute("system41")
    low_quality = service.execute("system41", {"input": {
        "image_inputs": {
            "shelf_image": {"image_id": "shelf-low", "width": 1280, "height": 720, "quality": "low"},
        },
        "sensor_events": [],
        "confidence_threshold": 0.75,
    }})

    item = next(value for value in default["result"]["recommendations"] if value["object"] == "item")
    assert item["product_id"] == "sku-100"
    assert item["master_matched"] is True
    assert item["ocr_supported"] is True
    assert item["sensor_supported"] is True
    assert item["estimated_quantity"] == 2
    assert default["state"] == "review_required"
    assert any(value["object"] == "unknown_box" for value in default["result"]["confirmation_queue"])
    assert any(item["disposition"] == "review_required" for item in low_quality["result"]["recommendations"])
    assert "画像品質不足" in low_quality["result"]["risk_flags"]
    assert "センサー不一致" in low_quality["result"]["risk_flags"]


def test_system41_records_human_review_in_run_history_and_audit_log() -> None:
    service = EnterpriseAiService()

    result = service.execute("system41", {"input": {"human_review": {
        "status": "confirmed",
        "reviewer": "store-reviewer",
        "decisions": {"unknown_box": "confirmed"},
    }}})

    review_record = result["result"]["human_review_record"]
    assert result["state"] == "confirmed"
    assert review_record["reviewer"] == "store-reviewer"
    assert review_record["recorded"] is True
    assert any(entry["action"] == "multimodal_detection_recorded" for entry in result["audit_log"])
    assert any(entry["action"] == "human_review_recorded" for entry in result["audit_log"])
    assert service.list_runs("system41")[0]["result"]["human_review_record"] == review_record


def test_system42_explains_risk_score_and_applies_hold_and_reject_thresholds() -> None:
    service = EnterpriseAiService()
    rejected = service.execute("system42")
    held = service.execute("system42", {"input": {"rule_thresholds": {
        "amount_multiplier": 5,
        "risk_hold": 0.4,
        "risk_reject": 0.95,
    }}})

    rejected_result = rejected["result"]["recommendations"][0]
    held_result = held["result"]["recommendations"][0]
    assert rejected_result["risk_score"] == pytest.approx(0.85)
    assert rejected_result["action"] == "rejected"
    assert "新しい端末" in rejected_result["signals"]
    assert "ログイン履歴" in rejected_result["signals"]
    assert rejected["result"]["alert"]["created"] is True
    assert held_result["risk_score"] == rejected_result["risk_score"]
    assert held_result["action"] == "held"


def test_system42_records_false_positive_false_negative_and_costs() -> None:
    service = EnterpriseAiService()
    false_positive = service.execute("system42", {"input": {"confirmation_result": {
        "status": "reviewed",
        "reviewer": "fraud-analyst",
        "actual_outcome": "legitimate",
    }}})
    false_negative = service.execute("system42", {"input": {
        "transaction_event": {"amount": 12000, "country": "JP", "hour": 12},
        "device_signal": {"new_device": False, "ip_reputation": "low"},
        "login_history": {"failed_attempts": 0, "new_location": False},
        "historical_patterns": {"chargeback_count": 0},
        "confirmation_result": {
            "status": "reviewed",
            "reviewer": "fraud-analyst",
            "actual_outcome": "fraud",
        },
    }})

    assert false_positive["state"] == "false_positive"
    assert false_positive["result"]["evaluation_record"]["estimated_cost"] == 3000
    assert false_positive["kpi_snapshot"]["false_positive_rate"] == 1.0
    assert any(entry["action"] == "risk_alert_recorded" for entry in false_positive["audit_log"])
    assert false_negative["state"] == "false_negative"
    assert false_negative["result"]["evaluation_record"]["estimated_cost"] == 50000
    assert false_negative["result"]["alert"]["created"] is False
    assert any(entry["action"] == "risk_review_recorded" for entry in false_negative["audit_log"])
    assert service.list_runs("system42")[0]["result"]["evaluation_record"]["classification"] == "false_negative"


def test_system43_reports_unassigned_jobs_duration_and_missing_required_jobs() -> None:
    service = EnterpriseAiService()
    result = service.execute("system43", {"input": {
        "jobs": [
            {"id": "job-1", "duration": 70},
            {"id": "job-2", "duration": 70},
            {"id": "job-3", "duration": 20},
        ],
        "resources": [{"id": "driver-a", "capacity": 2}],
        "constraints": {"max_duration": 60, "must_visit": ["job-1", "job-missing"]},
    }})

    summary = result["result"]["recommendations"][0]
    assignment = result["result"]["recommendations"][1]
    assert summary["unassigned_jobs"] == ["job-3"]
    assert summary["missing_required_jobs"] == ["job-missing"]
    assert summary["violation_count"] == 3
    assert assignment["within_duration"] is False
    assert set(result["result"]["risk_flags"]) == {"割当上限超過", "所要時間超過", "必須の仕事が見つからない"}
    assert result["state"] == "violation_found"
    assert result["result"]["cost_summary"]["unassigned_cost"] == 50
    assert {item["violation_type"] for item in result["result"]["adjustment_candidates"]} == {
        "unassigned",
        "missing_required",
        "duration",
    }


def test_system43_records_route_cost_and_human_adjustment() -> None:
    service = EnterpriseAiService()
    optimized = service.execute("system43")
    adjusted = service.execute("system43", {"input": {"human_adjustment": {
        "status": "applied",
        "operator": "dispatcher",
        "assignments": [
            {"resource": "driver-a", "jobs": ["job-2"]},
            {"resource": "driver-b", "jobs": ["job-1"]},
        ],
    }}})

    assert optimized["state"] == "accepted"
    assert optimized["result"]["route_plan"][0]["route"] == ["job-1"]
    assert optimized["result"]["route_plan"][1]["route"] == ["job-2"]
    assert optimized["result"]["cost_summary"]["total_cost"] == 6
    assert adjusted["state"] == "adjusted"
    assert adjusted["result"]["route_plan"][0]["route"] == ["job-2"]
    assert adjusted["result"]["human_adjustment_record"]["recorded"] is True
    assert adjusted["kpi_snapshot"]["human_adjustment_rate"] == 1.0
    assert any(entry["action"] == "human_adjustment_recorded" for entry in adjusted["audit_log"])
    assert service.list_runs("system43")[0]["result"]["human_adjustment_record"]["operator"] == "dispatcher"


def test_system44_separates_uplift_sample_and_guardrail_decision() -> None:
    service = EnterpriseAiService()
    rollout = service.execute("system44")
    slow = service.execute("system44", {"input": {"guardrail_metrics": {"latency_ms": 700, "complaint_rate": 0.01}}})

    rollout_result = rollout["result"]["recommendations"][0]
    slow_result = slow["result"]["recommendations"][0]
    assert rollout_result["control_rate"] == pytest.approx(0.082)
    assert rollout_result["variant_rate"] == pytest.approx(round(96 / 980, 4))
    assert rollout_result["relative_uplift"] > 0
    assert rollout_result["decision"] == "rollout"
    assert slow_result["decision"] == "continue_test"
    assert "応答時間の条件違反" in slow["result"]["risk_flags"]


def test_system44_records_quality_cost_failures_and_human_decision() -> None:
    service = EnterpriseAiService()
    analyzed = service.execute("system44")
    decided = service.execute("system44", {"input": {"human_review_result": {
        "status": "decided",
        "reviewer": "product-owner",
        "decision": "continue_test",
        "reason": "関連性エラーを減らしてから再評価する",
        "improvement_action": "失敗事例を追加して品質を再評価する",
        "next_experiment": "recommendation-v3",
    }}})

    assert analyzed["state"] == "analyzed"
    assert analyzed["result"]["quality_comparison"]["variant_accuracy"] == pytest.approx(0.90)
    assert analyzed["result"]["cost_comparison"]["variant_cost_per_conversion"] == pytest.approx(140.62)
    assert analyzed["result"]["failure_classifications"][0]["category"] == "relevance_error"
    assert analyzed["result"]["improvement_candidates"][0]["source"] == "relevance_error"
    assert decided["state"] == "decided"
    assert decided["result"]["decision_memo"]["recorded"] is True
    assert decided["result"]["decision_memo"]["next_experiment"] == "recommendation-v3"
    assert decided["kpi_snapshot"]["decision_completion_rate"] == 1.0
    assert any(entry["action"] == "experiment_decision_recorded" for entry in decided["audit_log"])
    assert service.list_runs("system44")[0]["result"]["decision_memo"]["reviewer"] == "product-owner"


@pytest.mark.parametrize(
    ("system_id", "run_file_argument", "input_data", "result_key"),
    [
        (
            "system41",
            "system41_run_file",
            {"human_review": {"status": "confirmed", "reviewer": "store-reviewer", "decisions": {"unknown_box": "confirmed"}}},
            "human_review_record",
        ),
        (
            "system42",
            "system42_run_file",
            {"confirmation_result": {"status": "reviewed", "reviewer": "fraud-analyst", "actual_outcome": "legitimate"}},
            "evaluation_record",
        ),
        (
            "system43",
            "system43_run_file",
            {"human_adjustment": {"status": "applied", "operator": "dispatcher", "assignments": [{"resource": "driver-a", "jobs": ["job-2"]}]}},
            "human_adjustment_record",
        ),
        (
            "system44",
            "system44_run_file",
            {"human_review_result": {"status": "decided", "reviewer": "product-owner", "decision": "continue_test", "reason": "再評価する", "improvement_action": "失敗事例を追加する", "next_experiment": "recommendation-v3"}},
            "decision_memo",
        ),
    ],
)
def test_system41_to_system44_persist_domain_records_and_restore_them_after_restart(
    tmp_path: Path,
    system_id: str,
    run_file_argument: str,
    input_data: dict[str, object],
    result_key: str,
) -> None:
    run_file = tmp_path / "enterprise_ai" / f"{system_id}_runs.json"
    service = EnterpriseAiService(**{run_file_argument: run_file})

    executed = service.execute(system_id, {"input": input_data})

    assert executed["storage"] == {
        "saved": True,
        "format": "json",
        "retention_limit": 20,
        "retained_runs": 1,
    }
    restarted_service = EnterpriseAiService(**{run_file_argument: run_file})
    restored = restarted_service.list_runs(system_id)
    assert restored[0]["run_id"] == executed["run_id"]
    assert restored[0]["result"][result_key] == executed["result"][result_key]
    assert restored[0]["audit_log"] == executed["audit_log"]
