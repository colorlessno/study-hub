from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class EnterpriseAiSystem:
    system_id: str
    title: str
    pattern: str
    default_input: dict[str, Any]
    state_flow: list[str]
    kpi_definitions: list[str]
    risk_points: list[str]


SYSTEMS: dict[str, EnterpriseAiSystem] = {
    "system37": EnterpriseAiSystem(
        system_id="system37",
        title="取引実行型AIコンシェルジュ",
        pattern="予約・申込・注文の業務実行",
        default_input={
            "customer_profile": {"segment": "member", "verified": True},
            "request_conditions": {"route": "Tokyo to Osaka", "date": "2026-05-15", "budget": 18000},
            "candidate_inventory": [
                {"id": "plan-a", "price": 16500, "available": True, "changeable": True},
                {"id": "plan-b", "price": 21000, "available": True, "changeable": False},
            ],
            "price_rules": {"max_budget_required": True, "confirmation_required": True},
            "identity_status": "verified",
            "user_confirmation": True,
            "transaction_request": {"action": "execute", "candidate_id": "plan-a"},
            "change_cancel_rules": {"change_allowed": True, "cancel_allowed": True},
        },
        state_flow=["hearing", "proposed", "confirming", "executed", "changed", "cancelled", "escalated"],
        kpi_definitions=[
            "execution_success_rate",
            "confirmation_rate",
            "cancellation_rate",
            "policy_violation_count",
            "average_response_ms",
        ],
        risk_points=["本人確認未完了", "価格条件不一致", "取消条件違反", "実行前確認漏れ"],
    ),
    "system38": EnterpriseAiSystem(
        system_id="system38",
        title="リアルタイム推薦・パーソナライズ",
        pattern="推薦・ランキング・パーソナライズ",
        default_input={
            "user_profile": {"segment": "repeat", "interests": ["coffee", "work"]},
            "behavior_events": ["view:beans", "cart:dripper", "view:subscription"],
            "item_catalog": [
                {"id": "item-a", "tags": ["coffee", "subscription"], "freshness": 0.9, "status": "in_stock"},
                {"id": "item-b", "tags": ["tea", "gift"], "freshness": 0.7, "status": "in_stock"},
                {"id": "item-c", "tags": ["coffee", "tool"], "freshness": 0.8, "status": "in_stock"},
            ],
            "context": {"device": "mobile", "time_band": "morning"},
            "exclusion_rules": ["out_of_stock"],
            "experiment": {
                "experiment_id": "ranking-layout-01",
                "user_key": "learner-001",
                "variants": ["control", "personalized"],
            },
            "feedback": {"item_id": "item-a", "event": "click"},
        },
        state_flow=["collected", "scored", "ranked", "displayed", "feedback_recorded", "retrained_candidate"],
        kpi_definitions=["click_through_rate", "conversion_rate", "diversity_score", "freshness_score", "latency_ms"],
        risk_points=["過剰最適化", "同質推薦", "除外条件漏れ", "説明不足"],
    ),
    "system39": EnterpriseAiSystem(
        system_id="system39",
        title="業務実行型カスタマーサポートAI",
        pattern="問い合わせ分類・回答・手続き実行",
        default_input={
            "customer_context": {
                "customer_id": "customer-001",
                "contract": "standard",
                "authenticated": True,
            },
            "inquiry_text": "配送先住所を変更したいです",
            "contract_status": "active",
            "order_info": {
                "order_id": "order-001",
                "shipping_status": "before_shipment",
            },
            "faq_candidates": ["住所変更は出荷前のみ可能です", "返金は7日以内です"],
            "requested_procedure": {
                "type": "update_address",
                "destination_label": "受取先B",
            },
            "operation_policy": {
                "address_change_requires_auth": True,
                "address_change_before_shipment_only": True,
                "refund_requires_auth": True,
            },
        },
        state_flow=["received", "classified", "verification_required", "answered", "processed", "escalated", "closed"],
        kpi_definitions=[
            "automation_rate",
            "escalation_rate",
            "first_contact_resolution",
            "policy_block_count",
            "answer_quality_score",
        ],
        risk_points=["権限外操作", "誤回答", "個人情報露出", "エスカレーション遅延"],
    ),
    "system40": EnterpriseAiSystem(
        system_id="system40",
        title="需要予測・在庫最適化AI",
        pattern="需要予測・補充判断・在庫配分",
        default_input={
            "sales_history": [18, 21, 19, 25, 31, 29, 35],
            "inventory_snapshot": {"sku-100": 42},
            "incoming_schedule": [{"quantity": 8, "arrives_within_lead_time": True}],
            "seasonality_factor": 1.1,
            "lead_time": 3,
            "promotion_calendar": [{"date": "2026-05-20", "lift": 1.3}],
            "store_constraints": {"min_stock": 20, "shelf_capacity": 80},
            "validation_actual": 37,
            "approval": {"status": "pending", "approver": ""},
        },
        state_flow=["forecasted", "risk_detected", "proposed", "approved", "rejected"],
        kpi_definitions=["forecast_error", "stockout_risk_rate", "surplus_cost", "service_level", "replenishment_count"],
        risk_points=["欠品", "過剰在庫", "季節性無視", "リードタイム誤り"],
    ),
    "system41": EnterpriseAiSystem(
        system_id="system41",
        title="コンピュータビジョン / マルチモーダルAI",
        pattern="画像・センサー入力の判定と業務連携",
        default_input={
            "image_inputs": {
                "shelf_image": {"image_id": "shelf-001", "width": 1280, "height": 720, "quality": "normal"},
                "receipt_image": {"image_id": "receipt-001", "width": 1024, "height": 768, "quality": "normal"},
            },
            "detection_candidates": [
                {"label": "item", "quantity": 2, "confidence": 0.9},
                {"label": "unknown_box", "quantity": 1, "confidence": 0.68},
            ],
            "product_master": [
                {"product_id": "sku-100", "name": "item", "aliases": ["item", "商品A"]},
                {"product_id": "sku-200", "name": "shelf_gap", "aliases": ["shelf_gap", "棚の空き"]},
            ],
            "ocr_results": [{"text": "商品A", "quantity": 2, "confidence": 0.92}],
            "sensor_events": [{"type": "weight_change", "product_id": "sku-100", "quantity_delta": -2}],
            "location_context": {"zone": "shelf-a"},
            "confidence_threshold": 0.75,
            "human_review": {"status": "pending", "reviewer": "", "decisions": {}},
        },
        state_flow=["uploaded", "detected", "matched", "review_required", "confirmed", "rejected"],
        kpi_definitions=["detection_accuracy", "master_match_rate", "review_rate", "false_positive_rate"],
        risk_points=["画像品質不足", "マスタ未登録商品", "センサー不一致", "レビュー未実施"],
    ),
    "system42": EnterpriseAiSystem(
        system_id="system42",
        title="不正検知・異常検知AI",
        pattern="取引・行動ログのリスク検知",
        default_input={
            "transaction_event": {"amount": 98000, "country": "JP", "hour": 2},
            "account_profile": {"usual_amount": 12000, "usual_country": "JP"},
            "device_signal": {"new_device": True, "ip_reputation": "medium"},
            "login_history": {"failed_attempts": 1, "new_location": False},
            "historical_patterns": {"chargeback_count": 0},
            "rule_thresholds": {"amount_multiplier": 5, "risk_hold": 0.4, "risk_reject": 0.8},
            "confirmation_result": {"status": "pending", "reviewer": "", "actual_outcome": ""},
            "cost_assumptions": {"false_positive": 3000, "false_negative": 50000},
        },
        state_flow=["scored", "allowed", "held", "rejected", "reviewed", "false_positive", "false_negative"],
        kpi_definitions=["detection_rate", "false_positive_rate", "processing_ms", "human_review_rate"],
        risk_points=["個人情報の過剰収集", "正常取引の誤ブロック", "不正取引の見逃し", "監査証跡不足"],
    ),
    "system43": EnterpriseAiSystem(
        system_id="system43",
        title="制約最適化AI",
        pattern="配送・シフト・割当の制約最適化",
        default_input={
            "jobs": [
                {"id": "job-1", "duration": 30, "location": {"x": 2, "y": 1}, "priority": 3},
                {"id": "job-2", "duration": 45, "location": {"x": 5, "y": 2}, "priority": 2},
            ],
            "resources": [
                {"id": "driver-a", "capacity": 3, "start_location": {"x": 0, "y": 0}, "available_window": "09:00-13:00"},
                {"id": "driver-b", "capacity": 2, "start_location": {"x": 6, "y": 0}, "available_window": "09:00-13:00"},
            ],
            "constraints": {"max_duration": 120, "max_route_distance": 12, "must_visit": ["job-1"]},
            "cost_weights": {"distance": 1.0, "delay": 2.0, "unassigned": 50.0, "overtime": 3.0},
            "time_windows": {"job-1": "09:00-11:00", "job-2": "10:00-12:00"},
            "human_adjustment": {"status": "pending", "operator": "", "assignments": []},
        },
        state_flow=["drafted", "optimized", "violation_found", "adjusted", "accepted"],
        kpi_definitions=["violation_count", "optimization_cost", "processing_ms", "human_adjustment_rate"],
        risk_points=["制約定義の漏れ", "過最適化", "人間調整なしの実行"],
    ),
    "system44": EnterpriseAiSystem(
        system_id="system44",
        title="AI KPI / 実験評価ダッシュボード",
        pattern="AI施策の実験評価・KPI監視",
        default_input={
            "experiment_config": {"name": "recommendation-v2", "primary_kpi": "conversion_rate"},
            "variant_results": {"control": {"users": 1000, "conversions": 82}, "variant": {"users": 980, "conversions": 96}},
            "ai_quality_metrics": {
                "control": {"accuracy": 0.86, "failure_count": 18},
                "variant": {"accuracy": 0.90, "failure_count": 12},
            },
            "cost_metrics": {"control_total": 12000, "variant_total": 13500},
            "guardrail_metrics": {"latency_ms": 420, "complaint_rate": 0.01},
            "failure_cases": [
                {"variant": "variant", "category": "relevance_error", "count": 5},
                {"variant": "variant", "category": "unsafe_output", "count": 0},
            ],
            "decision_rules": {
                "minimum_total_sample": 1000,
                "minimum_relative_uplift": 0.05,
                "maximum_latency_ms": 500,
                "maximum_complaint_rate": 0.02,
                "minimum_variant_quality": 0.85,
                "maximum_variant_cost_per_conversion": 160,
            },
            "human_review_result": {
                "status": "pending",
                "reviewer": "",
                "decision": "",
                "reason": "",
                "improvement_action": "",
                "next_experiment": "",
            },
            "segment_filters": ["member"],
            "evaluation_period": "2026-05-01/2026-05-14",
        },
        state_flow=["planned", "running", "measured", "analyzed", "decided", "archived"],
        kpi_definitions=["experiment_count", "ab_difference", "kpi_improvement_rate", "decision_completion_rate"],
        risk_points=["多重比較による誤判定", "評価基準の途中変更", "記録前の意思決定"],
    ),
}
