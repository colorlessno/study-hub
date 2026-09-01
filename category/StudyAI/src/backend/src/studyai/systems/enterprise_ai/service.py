from __future__ import annotations

import hashlib
import json
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

from studyai.common.ai.llm_client import LLMClient
from studyai.common.config.settings import get_settings
from studyai.systems.enterprise_ai.catalog import SYSTEMS, EnterpriseAiSystem


SECRET_KEYS = ("api_key", "password", "token", "secret", "card_number")
LmStudioRequester = Callable[[EnterpriseAiSystem, dict[str, Any]], dict[str, Any]]


class EnterpriseAiUpstreamError(RuntimeError):
    """Raised when an explicitly requested external model call fails."""


class EnterpriseAiService:
    def __init__(
        self,
        lmstudio_requester: LmStudioRequester | None = None,
        http_transport: httpx.BaseTransport | None = None,
        system37_run_file: Path | None = None,
        system38_run_file: Path | None = None,
        system39_run_file: Path | None = None,
        system40_run_file: Path | None = None,
        system41_run_file: Path | None = None,
        system42_run_file: Path | None = None,
        system43_run_file: Path | None = None,
        system44_run_file: Path | None = None,
    ) -> None:
        self._runs: dict[str, list[dict[str, Any]]] = {system_id: [] for system_id in SYSTEMS}
        self._http_transport = http_transport
        self._lmstudio_requester = lmstudio_requester or self._request_lmstudio_decision
        self._run_files = {
            "system37": system37_run_file,
            "system38": system38_run_file,
            "system39": system39_run_file,
            "system40": system40_run_file,
            "system41": system41_run_file,
            "system42": system42_run_file,
            "system43": system43_run_file,
            "system44": system44_run_file,
        }
        for system_id, run_file in self._run_files.items():
            self._load_persisted_runs(system_id, run_file)

    def get_system(self, system_id: str) -> EnterpriseAiSystem:
        if system_id not in SYSTEMS:
            raise KeyError(system_id)
        return SYSTEMS[system_id]

    def execute(self, system_id: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        system = self.get_system(system_id)
        request = payload or {}
        input_data = request.get("input", system.default_input) if "input" in request else request
        if not isinstance(input_data, dict):
            raise ValueError("input must be an object")

        mode = str(request.get("mode", "mock")) if isinstance(request, dict) else "mock"
        if mode not in {"mock", "lmstudio"}:
            raise ValueError("mode must be mock or lmstudio")
        operator = str(request.get("operator", "learner")) if isinstance(request, dict) else "learner"
        merged_input = self._mask_secrets({**system.default_input, **input_data})
        run_id = self._run_id(system_id, merged_input)
        started_at = datetime.now(timezone.utc)
        decision_source = "mock"
        if mode == "lmstudio":
            try:
                result = self._normalize_lmstudio_result(
                    system,
                    self._lmstudio_requester(system, merged_input),
                )
                decision_source = "lmstudio"
            except (httpx.HTTPError, KeyError, TypeError, ValueError) as exc:
                raise EnterpriseAiUpstreamError(
                    "LM Studioへの通信または応答検証に失敗しました。mockは明示的に選択した場合だけ実行できます。"
                ) from exc
        else:
            result = self._mock_decision(system, merged_input)
        result = self._enrich_result(system, merged_input, result)
        audit_log = self._audit_log(system, run_id, operator, merged_input, decision_source)
        audit_log.extend(self._domain_audit_log(system, run_id, result))
        kpi_snapshot = self._kpi_snapshot(system, result)
        run_file = self._run_files.get(system_id)
        run = {
            "run_id": run_id,
            "system_id": system.system_id,
            "title": system.title,
            "pattern": system.pattern,
            "state": result["state"],
            "input": merged_input,
            "result": result,
            "audit_log": audit_log,
            "kpi_snapshot": kpi_snapshot,
            "created_at": started_at.isoformat(),
            "storage": {
                "saved": run_file is not None,
                "format": "json" if run_file is not None else "process_memory",
                "retention_limit": 20,
                "retained_runs": min(len(self._runs[system_id]) + 1, 20),
            },
        }
        self._runs[system_id].insert(0, run)
        self._runs[system_id] = self._runs[system_id][:20]
        self._persist_runs(system_id, run_file)
        return run

    def list_runs(self, system_id: str) -> list[dict[str, Any]]:
        self.get_system(system_id)
        return self._runs[system_id]

    def _load_persisted_runs(self, system_id: str, run_file: Path | None) -> None:
        if run_file is None or not run_file.exists():
            return
        try:
            saved_runs = json.loads(run_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"{system_id}の実行履歴を読み込めません: {run_file}") from exc
        if not isinstance(saved_runs, list) or any(not isinstance(run, dict) for run in saved_runs):
            raise RuntimeError(f"{system_id}の実行履歴の形式が不正です: {run_file}")
        self._runs[system_id] = saved_runs[:20]

    def _persist_runs(self, system_id: str, run_file: Path | None) -> None:
        if run_file is None:
            return
        run_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = run_file.with_suffix(f"{run_file.suffix}.tmp")
        temporary_file.write_text(
            json.dumps(self._runs[system_id], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(run_file)

    def _request_lmstudio_decision(
        self,
        system: EnterpriseAiSystem,
        input_data: dict[str, Any],
    ) -> dict[str, Any]:
        settings = get_settings()
        response_schema = {
            "summary": "判断概要",
            "state": list(system.state_flow),
            "recommendations": [{"項目": "提案または判断結果"}],
            "explanations": ["判断理由"],
            "risk_flags": ["注意点。なければ空配列"],
        }
        payload = {
            "model": settings.get_llm_model(),
            "messages": [
                {
                    "role": "system",
                    "content": (
                        f"あなたは{system.title}の教材用判断エンジンです。"
                        "実行前確認、判断理由、監査可能性を重視し、JSONだけを返してください。"
                        f"業務パターン: {system.pattern}。"
                        f"注意点: {json.dumps(system.risk_points, ensure_ascii=False)}。"
                        f"出力形式: {json.dumps(response_schema, ensure_ascii=False)}"
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(input_data, ensure_ascii=False, sort_keys=True, default=str),
                },
            ],
            "temperature": 0,
        }
        with httpx.Client(timeout=settings.model_timeout_seconds, transport=self._http_transport) as client:
            response = client.post(
                f"{settings.get_ai_base_url()}/chat/completions",
                headers=settings.get_ai_headers(),
                json=payload,
            )
            response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return LLMClient._parse_json(content)

    def _normalize_lmstudio_result(
        self,
        system: EnterpriseAiSystem,
        value: dict[str, Any],
    ) -> dict[str, Any]:
        summary = value.get("summary")
        recommendations = value.get("recommendations")
        explanations = value.get("explanations")
        risk_flags = value.get("risk_flags")
        if not isinstance(summary, str) or not summary.strip():
            raise ValueError("LM Studio result.summary must be a non-empty string")
        if (
            not isinstance(recommendations, list)
            or not recommendations
            or not all(isinstance(item, dict) for item in recommendations)
        ):
            raise ValueError("LM Studio result.recommendations must be a non-empty object array")
        if not isinstance(explanations, list) or not all(isinstance(item, str) for item in explanations):
            raise ValueError("LM Studio result.explanations must be a string array")
        if not isinstance(risk_flags, list) or not all(isinstance(item, str) for item in risk_flags):
            raise ValueError("LM Studio result.risk_flags must be a string array")
        requested_state = value.get("state")
        state = requested_state if requested_state in system.state_flow else self._final_state(system, risk_flags)
        return {
            "summary": summary.strip(),
            "state": state,
            "recommendations": recommendations,
            "explanations": explanations,
            "risk_flags": risk_flags,
        }

    def _mock_decision(self, system: EnterpriseAiSystem, input_data: dict[str, Any]) -> dict[str, Any]:
        handler = getattr(self, f"_{system.system_id}", self._generic)
        summary, recommendations, risk_flags = handler(input_data)
        state = self._final_state(system, risk_flags)
        return {
            "summary": summary,
            "state": state,
            "recommendations": recommendations,
            "explanations": [
                f"{system.pattern} の教材用mock判定です。",
                "実企業システムそのものを再現するのではなく、判断境界と監査を学ぶための結果です。",
            ],
            "risk_flags": risk_flags,
        }

    def _enrich_result(
        self,
        system: EnterpriseAiSystem,
        input_data: dict[str, Any],
        result: dict[str, Any],
    ) -> dict[str, Any]:
        if system.system_id == "system37":
            decision = self._system37_decision(input_data)
            return {
                **result,
                "summary": decision["summary"],
                "state": decision["state"],
                "recommendations": decision["recommendations"],
                "explanations": decision["explanations"],
                "risk_flags": decision["risk_flags"],
                "missing_conditions": decision["missing_conditions"],
                "confirmation": decision["confirmation"],
                "selected_candidate": decision["selected_candidate"],
                "change_cancel_decision": decision["change_cancel_decision"],
                "transaction_record": decision["transaction_record"],
                "ai_assessment": {
                    "summary": result.get("summary", ""),
                    "recommendations": result.get("recommendations", []),
                    "explanations": result.get("explanations", []),
                },
            }

        if system.system_id == "system39":
            business_action, domain_risks = self._system39_decision(input_data)
            risk_flags = list(dict.fromkeys([*result.get("risk_flags", []), *domain_risks]))
            procedure_required = business_action["requested_action"] != "answer"
            procedure_status = (
                "accepted"
                if procedure_required and business_action["action_allowed"]
                else ("blocked" if procedure_required else "not_required")
            )
            case_id = f"support-{self._hash({'input': input_data, 'action': business_action})[:12]}"
            ticket_status = "handoff_required" if business_action["next_action"] == "escalate" else "resolved"
            support_case = {
                "case_id": case_id,
                "classification": business_action["intent"],
                "procedure_result": {
                    "action": business_action["requested_action"],
                    "status": procedure_status,
                    "customer_id": business_action["customer_id"],
                    "order_id": business_action["order_id"],
                    "destination_label": business_action["destination_label"],
                    "recorded": True,
                },
                "ticket": {
                    "ticket_id": f"ticket-{case_id.removeprefix('support-')}",
                    "status": ticket_status,
                    "reason": business_action["handoff_reason"],
                    "recorded": True,
                },
                "handoff_summary": (
                    {
                        "required": True,
                        "reason": business_action["handoff_reason"],
                        "summary": business_action["handoff_summary"],
                    }
                    if business_action["next_action"] == "escalate"
                    else {"required": False, "reason": "", "summary": ""}
                ),
            }
            return {
                **result,
                "state": self._final_state(system, risk_flags),
                "risk_flags": risk_flags,
                "business_action": business_action,
                "support_case": support_case,
            }

        if system.system_id == "system40":
            _, proposals, domain_risks = self._system40(input_data)
            proposal = proposals[0] if proposals else {}
            approval = input_data.get("approval", {})
            approval = approval if isinstance(approval, dict) else {}
            approval_status = str(approval.get("status", "pending"))
            if approval_status not in {"pending", "approved", "rejected"}:
                approval_status = "pending"
            approver = str(approval.get("approver", ""))
            proposal_id = f"replenishment-{self._hash({'input': input_data, 'proposal': proposal})[:12]}"
            order_candidate_recorded = approval_status == "approved" and bool(proposal.get("reorder_quantity", 0))
            risk_flags = list(dict.fromkeys([*result.get("risk_flags", []), *domain_risks]))
            return {
                **result,
                "state": approval_status if approval_status != "pending" else "proposed",
                "risk_flags": risk_flags,
                "replenishment_proposal": {
                    "proposal_id": proposal_id,
                    "forecast": proposal.get("forecast"),
                    "shortage_risk": "欠品" in domain_risks,
                    "reorder_quantity": proposal.get("reorder_quantity"),
                    "reason": proposal.get("replenishment_reason"),
                    "approval_status": approval_status,
                    "approver": approver,
                    "order_candidate_recorded": order_candidate_recorded,
                },
            }

        if system.system_id == "system41":
            decision = self._system41_decision(input_data)
            return {
                **result,
                "summary": decision["summary"],
                "state": decision["state"],
                "recommendations": decision["detections"],
                "risk_flags": decision["risks"],
                "confirmation_queue": decision["confirmation_queue"],
                "anomaly_candidates": decision["anomaly_candidates"],
                "human_review_record": decision["human_review_record"],
            }

        if system.system_id == "system42":
            decision = self._system42_decision(input_data)
            return {
                **result,
                "summary": decision["summary"],
                "state": decision["state"],
                "recommendations": [decision["score_breakdown"]],
                "risk_flags": decision["risks"],
                "alert": decision["alert"],
                "confirmation_record": decision["confirmation_record"],
                "evaluation_record": decision["evaluation_record"],
            }

        if system.system_id == "system43":
            decision = self._system43_decision(input_data)
            return {
                **result,
                "summary": decision["summary"],
                "state": decision["state"],
                "recommendations": [decision["optimization_summary"], *decision["assignments"]],
                "risk_flags": decision["risks"],
                "route_plan": decision["route_plan"],
                "violations": decision["violations"],
                "cost_summary": decision["cost_summary"],
                "adjustment_candidates": decision["adjustment_candidates"],
                "human_adjustment_record": decision["human_adjustment_record"],
            }

        if system.system_id == "system44":
            decision = self._system44_decision(input_data)
            return {
                **result,
                "summary": decision["summary"],
                "state": decision["state"],
                "recommendations": [decision["business_comparison"]],
                "risk_flags": decision["risks"],
                "quality_comparison": decision["quality_comparison"],
                "cost_comparison": decision["cost_comparison"],
                "guardrail_summary": decision["guardrail_summary"],
                "failure_classifications": decision["failure_classifications"],
                "improvement_candidates": decision["improvement_candidates"],
                "decision_memo": decision["decision_memo"],
            }

        if system.system_id != "system38":
            return result

        experiment = input_data.get("experiment", {})
        experiment = experiment if isinstance(experiment, dict) else {}
        variants = experiment.get("variants", ["control", "personalized"])
        if not isinstance(variants, list) or not variants or not all(isinstance(item, str) for item in variants):
            variants = ["control", "personalized"]
        user_key = str(experiment.get("user_key", "learner"))
        variant_index = int(hashlib.sha1(user_key.encode("utf-8")).hexdigest()[:8], 16) % len(variants)
        variant_assignment = {
            "experiment_id": str(experiment.get("experiment_id", "ranking-layout-01")),
            "user_key": user_key,
            "variant": variants[variant_index],
        }

        feedback = input_data.get("feedback", {})
        feedback = feedback if isinstance(feedback, dict) else {}
        reaction_log = {
            "event_id": self._hash({"experiment": variant_assignment, "feedback": feedback})[:12],
            "experiment_id": variant_assignment["experiment_id"],
            "variant": variant_assignment["variant"],
            "item_id": str(feedback.get("item_id", "")),
            "event": str(feedback.get("event", "")),
            "recorded": bool(feedback.get("item_id") and feedback.get("event")),
        }
        return {
            **result,
            "variant_assignment": variant_assignment,
            "reaction_log": reaction_log,
        }

    def _system37_decision(self, data: dict[str, Any]) -> dict[str, Any]:
        conditions_value = data.get("request_conditions", {})
        conditions = conditions_value if isinstance(conditions_value, dict) else {}
        required_conditions = {
            "route": "出発地と目的地を指定してください。",
            "date": "利用日を指定してください。",
            "budget": "予算の上限を指定してください。",
        }
        missing_conditions = [field for field in required_conditions if not conditions.get(field)]
        questions = [
            {"type": "question", "field": field, "question": required_conditions[field]}
            for field in missing_conditions
        ]

        try:
            budget = int(conditions.get("budget", 0))
        except (TypeError, ValueError):
            budget = 0
            if "budget" not in missing_conditions:
                missing_conditions.append("budget")
                questions.append({
                    "type": "question",
                    "field": "budget",
                    "question": "予算の上限を数値で指定してください。",
                })

        inventory_value = data.get("candidate_inventory", [])
        inventory = [dict(item) for item in inventory_value if isinstance(item, dict)] if isinstance(inventory_value, list) else []
        candidates = [item for item in inventory if item.get("available") is True]
        ranked = sorted(candidates, key=lambda item: (int(item.get("price", 0)) > budget, int(item.get("price", 0))))
        ranked_candidates = [
            {
                **item,
                "rank": index,
                "within_budget": int(item.get("price", 0)) <= budget,
            }
            for index, item in enumerate(ranked[:3], start=1)
        ]

        request_value = data.get("transaction_request", {})
        transaction_request = request_value if isinstance(request_value, dict) else {}
        action = str(transaction_request.get("action", "execute"))
        requested_candidate_id = str(transaction_request.get("candidate_id", ""))
        selected_candidate = next(
            (item for item in ranked_candidates if str(item.get("id", "")) == requested_candidate_id),
            ranked_candidates[0] if ranked_candidates and not requested_candidate_id else None,
        )

        price_rules_value = data.get("price_rules", {})
        price_rules = price_rules_value if isinstance(price_rules_value, dict) else {}
        change_rules_value = data.get("change_cancel_rules", {})
        change_rules = change_rules_value if isinstance(change_rules_value, dict) else {}
        identity_verified = data.get("identity_status") == "verified"
        confirmation_required = bool(price_rules.get("confirmation_required", True))
        confirmed = bool(data.get("user_confirmation"))
        change_allowed = bool(change_rules.get("change_allowed", False))
        cancel_allowed = bool(change_rules.get("cancel_allowed", False))
        candidate_changeable = bool(selected_candidate and selected_candidate.get("changeable"))
        within_budget = bool(selected_candidate and selected_candidate.get("within_budget"))

        state = "executed"
        risks: list[str] = []
        reason = "本人確認、価格条件、最終確認を通過しました。"
        recorded = True
        if missing_conditions:
            state = "hearing"
            risks.append("条件不足")
            reason = "取引条件が不足しているため、追加確認が必要です。"
            recorded = False
        elif not ranked_candidates:
            state = "escalated"
            risks.append("利用可能な候補なし")
            reason = "利用可能な候補がありません。"
            recorded = False
        elif selected_candidate is None:
            state = "escalated"
            risks.append("指定候補なし")
            reason = "指定された候補を利用できません。"
            recorded = False
        elif not identity_verified:
            state = "escalated"
            risks.append("本人確認未完了")
            reason = "本人確認が完了していません。"
            recorded = False
        elif bool(price_rules.get("max_budget_required", True)) and not within_budget:
            state = "escalated"
            risks.append("価格条件不一致")
            reason = "選択した候補が予算上限を超えています。"
            recorded = False
        elif confirmation_required and not confirmed:
            state = "confirming"
            risks.append("実行前確認待ち")
            reason = "利用者の最終確認を待っています。"
            recorded = False
        elif action == "change" and not (change_allowed and candidate_changeable):
            state = "escalated"
            risks.append("変更条件不一致")
            reason = "変更条件を満たしていません。"
            recorded = False
        elif action == "cancel" and not cancel_allowed:
            state = "escalated"
            risks.append("取消条件不一致")
            reason = "取消条件を満たしていません。"
            recorded = False
        elif action not in {"execute", "change", "cancel"}:
            state = "escalated"
            risks.append("操作種別不正")
            reason = "操作種別はexecute、change、cancelのいずれかを指定してください。"
            recorded = False
        elif action == "change":
            state = "changed"
            reason = "変更条件を満たしたため、変更結果を記録しました。"
        elif action == "cancel":
            state = "cancelled"
            reason = "取消条件を満たしたため、取消結果を記録しました。"

        status_by_state = {
            "hearing": "additional_information_required",
            "confirming": "confirmation_required",
            "executed": "executed",
            "changed": "changed",
            "cancelled": "cancelled",
            "escalated": "blocked",
        }
        transaction_record = {
            "transaction_id": f"transaction-{self._hash({'input': data, 'state': state})[:12]}",
            "action": action,
            "candidate_id": str(selected_candidate.get("id", "")) if selected_candidate else "",
            "status": status_by_state[state],
            "recorded": recorded,
            "reason": reason,
        }
        recommendations = questions if questions else ranked_candidates
        summary = {
            "hearing": "不足している条件を確認してから候補を比較します。",
            "confirming": "候補を比較し、利用者の最終確認を待っています。",
            "executed": "条件に合う候補を確定し、実行結果を記録しました。",
            "changed": "変更条件を確認し、変更結果を記録しました。",
            "cancelled": "取消条件を確認し、取消結果を記録しました。",
            "escalated": "条件を満たさないため取引を停止し、理由を記録しました。",
        }[state]
        return {
            "summary": summary,
            "state": state,
            "recommendations": recommendations or [{"type": "notice", "message": "利用可能な候補がありません。"}],
            "explanations": [reason],
            "risk_flags": risks,
            "missing_conditions": missing_conditions,
            "confirmation": {
                "required": confirmation_required,
                "confirmed": confirmed,
                "identity_verified": identity_verified,
            },
            "selected_candidate": selected_candidate or {},
            "change_cancel_decision": {
                "requested_action": action,
                "change_allowed": change_allowed,
                "cancel_allowed": cancel_allowed,
                "candidate_changeable": candidate_changeable,
                "allowed": recorded,
                "reason": reason,
            },
            "transaction_record": transaction_record,
        }

    def _system37(self, data: dict[str, Any]) -> tuple[str, list[dict[str, Any]], list[str]]:
        decision = self._system37_decision(data)
        return decision["summary"], decision["recommendations"], decision["risk_flags"]

    def _system38(self, data: dict[str, Any]) -> tuple[str, list[dict[str, Any]], list[str]]:
        interests = set(data.get("user_profile", {}).get("interests", []))
        exclusion_rules = set(data.get("exclusion_rules", []))
        items = [
            item
            for item in data.get("item_catalog", [])
            if not ("out_of_stock" in exclusion_rules and item.get("status") == "out_of_stock")
        ]
        ranked = sorted(
            [
                {
                    **item,
                    "interest_matches": sorted(interests.intersection(item.get("tags", []))),
                    "interest_score": len(interests.intersection(item.get("tags", []))),
                    "freshness_score": float(item.get("freshness", 0)),
                    "score": round(len(interests.intersection(item.get("tags", []))) + float(item.get("freshness", 0)), 3),
                }
                for item in items
            ],
            key=lambda item: item["score"],
            reverse=True,
        )
        ranked = [{**item, "rank": index} for index, item in enumerate(ranked, start=1)]
        risks = ["同質推薦"] if len({tag for item in ranked[:2] for tag in item.get("tags", [])}) <= 2 else []
        return "行動イベントと鮮度から推薦順位を生成しました。", ranked, risks

    def _system39(self, data: dict[str, Any]) -> tuple[str, list[dict[str, Any]], list[str]]:
        recommendation, risks = self._system39_decision(data)
        summary = "回答内容と業務操作を分けて判定しました。" if recommendation["action_allowed"] else "本人確認または手続き条件が不足しているため、業務操作を停止しました。"
        return summary, [recommendation], risks

    def _system39_decision(self, data: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
        text = str(data.get("inquiry_text", ""))
        intent = "address_change" if "住所" in text else ("refund" if "返金" in text or "返品" in text else "general_question")
        customer_context = data.get("customer_context", {})
        customer_context = customer_context if isinstance(customer_context, dict) else {}
        order_info = data.get("order_info", {})
        order_info = order_info if isinstance(order_info, dict) else {}
        procedure = data.get("requested_procedure", {})
        procedure = procedure if isinstance(procedure, dict) else {}
        policy = data.get("operation_policy", {})
        policy = policy if isinstance(policy, dict) else {}
        authenticated = bool(customer_context.get("authenticated"))
        requires_auth = (
            intent == "address_change" and bool(policy.get("address_change_requires_auth"))
        ) or (
            intent == "refund" and bool(policy.get("refund_requires_auth", True))
        )
        before_shipment_required = intent == "address_change" and bool(policy.get("address_change_before_shipment_only"))
        before_shipment = order_info.get("shipping_status") == "before_shipment"
        action_allowed = (not requires_auth or authenticated) and (not before_shipment_required or before_shipment)
        risks = []
        if requires_auth and not authenticated:
            risks.append("権限外操作")
        if before_shipment_required and not before_shipment:
            risks.append("出荷後の住所変更")
        faq_candidates = data.get("faq_candidates", [])
        if intent == "address_change":
            answer = next((candidate for candidate in faq_candidates if "住所" in candidate), "担当者へ確認してください。")
        elif intent == "refund":
            answer = next((candidate for candidate in faq_candidates if "返金" in candidate), "担当者へ確認してください。")
        else:
            answer = faq_candidates[0] if faq_candidates else "該当する回答がありません。"
        requested_action = (
            str(procedure.get("type", "update_address"))
            if intent == "address_change"
            else ("request_refund" if intent == "refund" else "answer")
        )
        next_action = requested_action if action_allowed and intent != "general_question" else ("answer" if intent == "general_question" else "escalate")
        handoff_reason = "、".join(risks) if risks else ""
        recommendation = {
            "intent": intent,
            "answer": answer,
            "requested_action": requested_action,
            "action_allowed": action_allowed,
            "next_action": next_action,
            "authentication_checked": requires_auth,
            "shipping_status_checked": before_shipment_required,
            "customer_id": str(customer_context.get("customer_id", "")),
            "order_id": str(order_info.get("order_id", "")),
            "destination_label": str(procedure.get("destination_label", "")),
            "handoff_reason": handoff_reason,
            "handoff_summary": (
                f"問い合わせ「{text}」は{handoff_reason}のため、{requested_action}を実行せず担当者へ引き継ぎます。"
                if handoff_reason
                else ""
            ),
        }
        return recommendation, risks

    def _system40(self, data: dict[str, Any]) -> tuple[str, list[dict[str, Any]], list[str]]:
        history = [float(v) for v in data.get("sales_history", [])]
        base_forecast = round(sum(history[-3:]) / max(1, min(3, len(history))), 2) if history else 0
        promotion_lifts = [float(item.get("lift", 1)) for item in data.get("promotion_calendar", [])]
        promotion_lift = max(promotion_lifts, default=1.0)
        seasonality_factor = float(data.get("seasonality_factor", 1.0))
        forecast = round(base_forecast * promotion_lift * seasonality_factor, 2)
        stock = int(next(iter(data.get("inventory_snapshot", {"sku": 0}).values())))
        incoming = sum(
            int(item.get("quantity", 0))
            for item in data.get("incoming_schedule", [])
            if item.get("arrives_within_lead_time")
        )
        available_stock = stock + incoming
        lead_time = max(1, int(data.get("lead_time", 1)))
        constraints = data.get("store_constraints", {})
        min_stock = int(constraints.get("min_stock", 0))
        shelf_capacity = max(min_stock, int(constraints.get("shelf_capacity", 0)))
        demand_during_lead_time = round(forecast * lead_time, 2)
        target_stock = min(shelf_capacity, max(min_stock, int(round(demand_during_lead_time))))
        reorder = max(0, target_stock - available_stock)
        actual = data.get("validation_actual")
        forecast_error_rate = round(abs(forecast - float(actual)) / max(1.0, float(actual)), 3) if actual is not None else None
        risks = []
        if available_stock < demand_during_lead_time:
            risks.append("欠品")
        if stock > shelf_capacity:
            risks.append("過剰在庫")
        return "需要予測、在庫制約、リードタイムから補充案を算出しました。", [{
            "base_forecast": base_forecast,
            "promotion_lift": promotion_lift,
            "seasonality_factor": seasonality_factor,
            "forecast": forecast,
            "validation_actual": actual,
            "forecast_error_rate": forecast_error_rate,
            "current_stock": stock,
            "incoming_within_lead_time": incoming,
            "available_stock": available_stock,
            "lead_time": lead_time,
            "demand_during_lead_time": demand_during_lead_time,
            "min_stock": min_stock,
            "shelf_capacity": shelf_capacity,
            "target_stock": target_stock,
            "reorder_quantity": reorder,
            "replenishment_reason": (
                f"リードタイム中の需要{demand_during_lead_time}に対し、利用可能在庫{available_stock}と最低在庫{min_stock}、棚容量{shelf_capacity}を比較しました。"
            ),
        }], risks

    def _system41(self, data: dict[str, Any]) -> tuple[str, list[dict[str, Any]], list[str]]:
        decision = self._system41_decision(data)
        return decision["summary"], decision["detections"], decision["risks"]

    def _system41_decision(self, data: dict[str, Any]) -> dict[str, Any]:
        image_inputs = data.get("image_inputs", {})
        image_inputs = image_inputs if isinstance(image_inputs, dict) else {}
        legacy_metadata = data.get("image_metadata", {})
        legacy_metadata = legacy_metadata if isinstance(legacy_metadata, dict) else {}
        shelf_image = image_inputs.get("shelf_image", legacy_metadata)
        shelf_image = shelf_image if isinstance(shelf_image, dict) else {}
        width = int(shelf_image.get("width", 0))
        height = int(shelf_image.get("height", 0))
        quality = str(shelf_image.get("quality", "normal"))
        threshold = min(1.0, max(0.0, float(data.get("confidence_threshold", 0.75))))
        resolution_score = min(1.0, max(0.2, (width * height) / (1280 * 720)))
        quality_factor = {"high": 1.05, "normal": 1.0, "low": 0.7}.get(quality, 0.85)

        product_master = [item for item in data.get("product_master", []) if isinstance(item, dict)]
        master_by_alias: dict[str, dict[str, Any]] = {}
        for item in product_master:
            aliases = [item.get("name", ""), *item.get("aliases", [])]
            for alias in aliases:
                if str(alias).strip():
                    master_by_alias[str(alias).strip().lower()] = item

        ocr_results = [item for item in data.get("ocr_results", []) if isinstance(item, dict)]
        sensor_events = [item for item in data.get("sensor_events", []) if isinstance(item, dict)]
        review = data.get("human_review", {})
        review = review if isinstance(review, dict) else {}
        review_status = str(review.get("status", "pending"))
        if review_status not in {"pending", "confirmed", "rejected"}:
            review_status = "pending"
        reviewer = str(review.get("reviewer", ""))
        decisions = review.get("decisions", {})
        decisions = decisions if isinstance(decisions, dict) else {}

        candidates = data.get("detection_candidates", [])
        candidates = candidates if isinstance(candidates, list) else []
        detections: list[dict[str, Any]] = []
        confirmation_queue: list[dict[str, Any]] = []
        anomaly_candidates: list[dict[str, Any]] = []
        risks: list[str] = []

        for index, raw_candidate in enumerate(candidates):
            candidate = raw_candidate if isinstance(raw_candidate, dict) else {"label": str(raw_candidate)}
            label = str(candidate.get("label", candidate.get("object", ""))).strip()
            master = master_by_alias.get(label.lower())
            product_id = str(master.get("product_id", "")) if master else ""
            aliases = [label]
            if master:
                aliases.extend([str(master.get("name", "")), *[str(value) for value in master.get("aliases", [])]])
            normalized_aliases = [alias.lower() for alias in aliases if alias]
            matching_ocr = next(
                (
                    item for item in ocr_results
                    if any(alias in str(item.get("text", "")).lower() for alias in normalized_aliases)
                ),
                None,
            )
            matching_sensor = next(
                (
                    item for item in sensor_events
                    if (product_id and str(item.get("product_id", "")) == product_id)
                    or str(item.get("label", "")).lower() == label.lower()
                ),
                None,
            )
            image_quantity = int(candidate.get("quantity", 1))
            ocr_quantity = int(matching_ocr.get("quantity", 0)) if matching_ocr else 0
            sensor_quantity = abs(int(matching_sensor.get("quantity_delta", matching_sensor.get("quantity", 0)))) if matching_sensor else 0
            observed_quantities = [value for value in (image_quantity, ocr_quantity, sensor_quantity) if value > 0]
            quantity_mismatch = len(set(observed_quantities)) > 1
            estimated_quantity = sensor_quantity or ocr_quantity or image_quantity
            base_confidence = float(candidate.get("confidence", max(0.45, 0.88 - index * 0.08)))
            evidence_bonus = (0.04 if matching_ocr else 0.0) + (0.04 if matching_sensor else 0.0)
            confidence = min(0.99, base_confidence * resolution_score * quality_factor + evidence_bonus)
            above_threshold = confidence >= threshold
            review_reasons = []
            if not master:
                review_reasons.append("商品マスタ未登録")
            if not above_threshold:
                review_reasons.append("信頼度がしきい値未満")
            if not matching_sensor:
                review_reasons.append("センサーの裏付けなし")
            if quantity_mismatch:
                review_reasons.append("数量不一致")

            candidate_decision = str(decisions.get(label, ""))
            if review_status == "confirmed" and candidate_decision in {"confirmed", "rejected"}:
                disposition = candidate_decision
            elif review_status == "rejected" and review_reasons:
                disposition = "rejected"
            else:
                disposition = "review_required" if review_reasons else "confirmed"

            detection = {
                "object": label,
                "product_id": product_id,
                "master_matched": bool(master),
                "image_quantity": image_quantity,
                "ocr_quantity": ocr_quantity,
                "sensor_quantity": sensor_quantity,
                "estimated_quantity": estimated_quantity,
                "quantity_mismatch": quantity_mismatch,
                "confidence": round(confidence, 3),
                "threshold": threshold,
                "above_threshold": above_threshold,
                "ocr_supported": bool(matching_ocr),
                "sensor_supported": bool(matching_sensor),
                "review_reasons": review_reasons,
                "disposition": disposition,
            }
            detections.append(detection)
            if disposition == "review_required":
                confirmation_queue.append({
                    "object": label,
                    "product_id": product_id,
                    "reasons": review_reasons,
                    "estimated_quantity": estimated_quantity,
                })
            if review_reasons:
                anomaly_candidates.append({
                    "object": label,
                    "reasons": review_reasons,
                })

        if quality == "low" or resolution_score < 0.6:
            risks.append("画像品質不足")
        if any(not item["master_matched"] for item in detections):
            risks.append("マスタ未登録商品")
        if any(not item["sensor_supported"] for item in detections):
            risks.append("センサー不一致")
        if confirmation_queue:
            risks.append("レビュー未実施")
        if not detections:
            risks.append("検出候補なし")

        if review_status == "rejected":
            state = "rejected"
        elif review_status == "confirmed":
            state = "confirmed"
        elif confirmation_queue:
            state = "review_required"
        else:
            state = "confirmed"
        review_recorded = review_status in {"confirmed", "rejected"}
        review_record = {
            "review_id": f"review-{self._hash({'detections': detections, 'review': review})[:12]}",
            "status": review_status,
            "reviewer": reviewer,
            "decisions": decisions,
            "recorded": review_recorded,
        }
        summary = "画像、OCR、商品マスタ、センサーを照合し、人間確認が必要な候補を分けました。"
        return {
            "summary": summary,
            "state": state,
            "detections": detections or [{"object": "-", "disposition": "review_required"}],
            "risks": list(dict.fromkeys(risks)),
            "confirmation_queue": confirmation_queue,
            "anomaly_candidates": anomaly_candidates,
            "human_review_record": review_record,
        }

    def _system42(self, data: dict[str, Any]) -> tuple[str, list[dict[str, Any]], list[str]]:
        decision = self._system42_decision(data)
        return decision["summary"], [decision["score_breakdown"]], decision["risks"]

    def _system42_decision(self, data: dict[str, Any]) -> dict[str, Any]:
        event = data.get("transaction_event", {})
        event = event if isinstance(event, dict) else {}
        profile = data.get("account_profile", {})
        profile = profile if isinstance(profile, dict) else {}
        device = data.get("device_signal", {})
        device = device if isinstance(device, dict) else {}
        login_history = data.get("login_history", {})
        login_history = login_history if isinstance(login_history, dict) else {}
        history = data.get("historical_patterns", {})
        history = history if isinstance(history, dict) else {}
        thresholds = data.get("rule_thresholds", {})
        thresholds = thresholds if isinstance(thresholds, dict) else {}
        amount = float(event.get("amount", 0))
        usual = max(1.0, float(profile.get("usual_amount", 1)))
        amount_ratio = amount / usual
        amount_limit = max(1.0, float(thresholds.get("amount_multiplier", 5)))
        amount_points = min(0.5, 0.5 * amount_ratio / amount_limit)
        country_points = 0.15 if event.get("country") != profile.get("usual_country") else 0.0
        hour = int(event.get("hour", 12))
        time_points = 0.1 if hour < 6 or hour >= 23 else 0.0
        new_device_points = 0.15 if device.get("new_device") else 0.0
        reputation_points = {"low": 0.0, "medium": 0.05, "high": 0.15}.get(str(device.get("ip_reputation", "low")), 0.0)
        login_points = min(0.2, int(login_history.get("failed_attempts", 0)) * 0.05)
        if login_history.get("new_location"):
            login_points = min(0.2, login_points + 0.1)
        history_points = min(0.2, int(history.get("chargeback_count", 0)) * 0.1)
        risk_score = min(1.0, amount_points + country_points + time_points + new_device_points + reputation_points + login_points + history_points)
        reject_threshold = min(1.0, max(0.0, float(thresholds.get("risk_reject", thresholds.get("risk_block", 0.8)))))
        hold_threshold = min(reject_threshold, max(0.0, float(thresholds.get("risk_hold", reject_threshold * 0.5))))
        action = "rejected" if risk_score >= reject_threshold else ("held" if risk_score >= hold_threshold else "allowed")
        signals = []
        if amount_ratio >= amount_limit:
            signals.append("通常より高額")
        if country_points:
            signals.append("通常と異なる国")
        if time_points:
            signals.append("深夜時間帯")
        if new_device_points:
            signals.append("新しい端末")
        if reputation_points:
            signals.append("IP評価")
        if login_points:
            signals.append("ログイン履歴")
        if history_points:
            signals.append("過去の支払取消")
        risks = ["高リスク取引"] if action == "rejected" else (["要調査"] if action == "held" else [])
        confirmation = data.get("confirmation_result", {})
        confirmation = confirmation if isinstance(confirmation, dict) else {}
        confirmation_status = str(confirmation.get("status", "pending"))
        if confirmation_status not in {"pending", "reviewed"}:
            confirmation_status = "pending"
        reviewer = str(confirmation.get("reviewer", ""))
        actual_outcome = str(confirmation.get("actual_outcome", ""))
        if actual_outcome not in {"", "legitimate", "fraud"}:
            actual_outcome = ""

        evaluation = "unreviewed"
        state = action
        if confirmation_status == "reviewed" and actual_outcome:
            if actual_outcome == "legitimate" and action in {"held", "rejected"}:
                evaluation = "false_positive"
                state = "false_positive"
                risks.append("正常取引の誤ブロック")
            elif actual_outcome == "fraud" and action == "allowed":
                evaluation = "false_negative"
                state = "false_negative"
                risks.append("不正取引の見逃し")
            else:
                evaluation = "correct_detection" if actual_outcome == "fraud" else "correct_allow"
                state = "reviewed"

        costs = data.get("cost_assumptions", {})
        costs = costs if isinstance(costs, dict) else {}
        false_positive_cost = float(costs.get("false_positive", 0))
        false_negative_cost = float(costs.get("false_negative", 0))
        estimated_cost = (
            false_positive_cost
            if evaluation == "false_positive"
            else (false_negative_cost if evaluation == "false_negative" else 0.0)
        )
        alert_id = f"alert-{self._hash({'event': event, 'score': risk_score})[:12]}"
        score_breakdown = {
            "amount_ratio": round(amount_ratio, 3),
            "amount_points": round(amount_points, 3),
            "country_points": round(country_points, 3),
            "time_points": round(time_points, 3),
            "new_device_points": round(new_device_points, 3),
            "reputation_points": round(reputation_points, 3),
            "login_points": round(login_points, 3),
            "history_points": round(history_points, 3),
            "risk_score": round(risk_score, 3),
            "hold_threshold": hold_threshold,
            "reject_threshold": reject_threshold,
            "action": action,
            "signals": signals,
        }
        return {
            "summary": "取引、ログイン、端末、過去履歴を加点し、許可・保留・拒否と確認後の評価を記録しました。",
            "state": state,
            "score_breakdown": score_breakdown,
            "risks": list(dict.fromkeys(risks)),
            "alert": {
                "alert_id": alert_id,
                "created": action in {"held", "rejected"},
                "action": action,
                "risk_score": round(risk_score, 3),
                "reasons": signals,
            },
            "confirmation_record": {
                "status": confirmation_status,
                "reviewer": reviewer,
                "actual_outcome": actual_outcome,
                "recorded": confirmation_status == "reviewed" and bool(actual_outcome),
            },
            "evaluation_record": {
                "classification": evaluation,
                "estimated_cost": estimated_cost,
                "false_positive_cost": false_positive_cost,
                "false_negative_cost": false_negative_cost,
            },
        }

    def _system43(self, data: dict[str, Any]) -> tuple[str, list[dict[str, Any]], list[str]]:
        decision = self._system43_decision(data)
        recommendations = [decision["optimization_summary"], *decision["assignments"]]
        return decision["summary"], recommendations, decision["risks"]

    def _system43_decision(self, data: dict[str, Any]) -> dict[str, Any]:
        raw_jobs = data.get("jobs", [])
        jobs = [dict(item) for item in raw_jobs if isinstance(item, dict)] if isinstance(raw_jobs, list) else []
        raw_resources = data.get("resources", [])
        resources = [dict(item) for item in raw_resources if isinstance(item, dict)] if isinstance(raw_resources, list) else []
        constraints = data.get("constraints", {})
        constraints = constraints if isinstance(constraints, dict) else {}
        weights = data.get("cost_weights", {})
        weights = weights if isinstance(weights, dict) else {}
        time_windows = data.get("time_windows", {})
        time_windows = time_windows if isinstance(time_windows, dict) else {}
        adjustment = data.get("human_adjustment", {})
        adjustment = adjustment if isinstance(adjustment, dict) else {}
        adjustment_status = str(adjustment.get("status", "pending"))
        if adjustment_status not in {"pending", "applied", "accepted"}:
            adjustment_status = "pending"
        adjustment_rows = adjustment.get("assignments", [])
        adjustment_rows = adjustment_rows if isinstance(adjustment_rows, list) else []

        def point(value: Any) -> tuple[float, float]:
            if not isinstance(value, dict):
                return 0.0, 0.0
            return float(value.get("x", 0)), float(value.get("y", 0))

        def distance(left: Any, right: Any) -> float:
            left_x, left_y = point(left)
            right_x, right_y = point(right)
            return abs(left_x - right_x) + abs(left_y - right_y)

        def clock_minutes(value: Any, default: int) -> int:
            try:
                hour, minute = str(value).split(":", 1)
                return int(hour) * 60 + int(minute)
            except (TypeError, ValueError):
                return default

        def window_minutes(value: Any, default_start: int, default_end: int) -> tuple[int, int]:
            parts = str(value).split("-", 1)
            if len(parts) != 2:
                return default_start, default_end
            return clock_minutes(parts[0], default_start), clock_minutes(parts[1], default_end)

        resource_plans = [
            {
                "resource": str(resource.get("id", "")),
                "capacity": max(0, int(resource.get("capacity", 0))),
                "start_location": resource.get("start_location", {}),
                "available_window": str(resource.get("available_window", "09:00-17:00")),
                "jobs": [],
            }
            for resource in resources
            if str(resource.get("id", ""))
        ]
        jobs_by_id = {str(job.get("id", "")): job for job in jobs if str(job.get("id", ""))}
        assigned_ids: set[str] = set()
        manual_plan_used = adjustment_status in {"applied", "accepted"} and bool(adjustment_rows)

        if manual_plan_used:
            plans_by_resource = {item["resource"]: item for item in resource_plans}
            for row in adjustment_rows:
                if not isinstance(row, dict):
                    continue
                plan = plans_by_resource.get(str(row.get("resource", "")))
                job_ids = row.get("jobs", [])
                if plan is None or not isinstance(job_ids, list):
                    continue
                for job_id in job_ids:
                    normalized_id = str(job_id)
                    if normalized_id in jobs_by_id and normalized_id not in assigned_ids and len(plan["jobs"]) < plan["capacity"]:
                        plan["jobs"].append(jobs_by_id[normalized_id])
                        assigned_ids.add(normalized_id)
        else:
            distance_weight = float(weights.get("distance", 1.0))
            sorted_jobs = sorted(jobs, key=lambda item: (-int(item.get("priority", 0)), str(item.get("id", ""))))
            for job in sorted_jobs:
                available = [item for item in resource_plans if len(item["jobs"]) < item["capacity"]]
                if not available:
                    continue
                target = min(
                    available,
                    key=lambda item: (
                        distance(
                            item["jobs"][-1].get("location", {}) if item["jobs"] else item["start_location"],
                            job.get("location", {}),
                        ) * distance_weight,
                        sum(int(value.get("duration", 0)) for value in item["jobs"]),
                        item["resource"],
                    ),
                )
                target["jobs"].append(job)
                assigned_ids.add(str(job.get("id", "")))

        unassigned = [job_id for job_id in jobs_by_id if job_id not in assigned_ids]
        required_job_ids = {str(item) for item in constraints.get("must_visit", [])}
        missing_required = sorted(required_job_ids - set(jobs_by_id))
        max_duration = max(0, int(constraints.get("max_duration", 0)))
        max_route_distance = max(0.0, float(constraints.get("max_route_distance", 0)))
        violations: list[dict[str, Any]] = []
        route_plan: list[dict[str, Any]] = []
        assignments: list[dict[str, Any]] = []
        total_distance = 0.0
        total_delay = 0
        total_overtime = 0

        if unassigned:
            violations.append({"type": "unassigned", "resource": "", "jobs": unassigned, "reason": "担当可能件数を超えています。"})
        if missing_required:
            violations.append({"type": "missing_required", "resource": "", "jobs": missing_required, "reason": "必須の仕事が入力に存在しません。"})

        for plan in resource_plans:
            available_start, available_end = window_minutes(plan["available_window"], 9 * 60, 17 * 60)
            current_time = available_start
            current_location = plan["start_location"]
            resource_distance = 0.0
            resource_delay = 0
            stops = []
            for job in plan["jobs"]:
                job_id = str(job.get("id", ""))
                leg_distance = distance(current_location, job.get("location", {}))
                travel_minutes = int(round(leg_distance * 10))
                arrival = current_time + travel_minutes
                job_window = time_windows.get(job_id, job.get("time_window", ""))
                window_start, window_end = window_minutes(job_window, available_start, available_end)
                scheduled_start = max(arrival, window_start)
                scheduled_end = scheduled_start + max(0, int(job.get("duration", 0)))
                delay_minutes = max(0, scheduled_end - window_end)
                resource_delay += delay_minutes
                resource_distance += leg_distance
                stops.append({
                    "job": job_id,
                    "priority": int(job.get("priority", 0)),
                    "location": job.get("location", {}),
                    "time_window": str(job_window),
                    "arrival_minute": arrival,
                    "scheduled_start_minute": scheduled_start,
                    "scheduled_end_minute": scheduled_end,
                    "delay_minutes": delay_minutes,
                    "leg_distance": round(leg_distance, 2),
                })
                current_time = scheduled_end
                current_location = job.get("location", {})

            total_duration = max(0, current_time - available_start)
            overtime = max(0, current_time - available_end, total_duration - max_duration if max_duration else 0)
            within_duration = overtime == 0
            within_distance = max_route_distance <= 0 or resource_distance <= max_route_distance
            if not within_duration:
                violations.append({"type": "duration", "resource": plan["resource"], "jobs": [], "reason": f"稼働時間を{overtime}分超過しています。"})
            if not within_distance:
                violations.append({"type": "route_distance", "resource": plan["resource"], "jobs": [], "reason": "ルート距離の上限を超えています。"})
            delayed_jobs = [stop["job"] for stop in stops if stop["delay_minutes"] > 0]
            if delayed_jobs:
                violations.append({"type": "time_window", "resource": plan["resource"], "jobs": delayed_jobs, "reason": "時間枠を超過する仕事があります。"})
            route_plan.append({
                "resource": plan["resource"],
                "start_location": plan["start_location"],
                "route": [stop["job"] for stop in stops],
                "stops": stops,
                "distance": round(resource_distance, 2),
                "delay_minutes": resource_delay,
                "overtime_minutes": overtime,
            })
            assignments.append({
                "type": "assignment",
                "resource": plan["resource"],
                "jobs": [str(job.get("id", "")) for job in plan["jobs"]],
                "job_count": len(plan["jobs"]),
                "capacity": plan["capacity"],
                "total_duration": total_duration,
                "max_duration": max_duration,
                "within_duration": within_duration,
                "route_distance": round(resource_distance, 2),
                "max_route_distance": max_route_distance,
                "within_route_distance": within_distance,
            })
            total_distance += resource_distance
            total_delay += resource_delay
            total_overtime += overtime

        cost_summary = {
            "distance_cost": round(total_distance * float(weights.get("distance", 1.0)), 2),
            "delay_cost": round(total_delay * float(weights.get("delay", 0.0)), 2),
            "unassigned_cost": round(len(unassigned) * float(weights.get("unassigned", 0.0)), 2),
            "overtime_cost": round(total_overtime * float(weights.get("overtime", 0.0)), 2),
        }
        cost_summary["total_cost"] = round(sum(cost_summary.values()), 2)

        candidate_by_type = {
            "unassigned": {"action": "add_or_reassign_resource", "reason": "担当可能件数を増やすか、未割当の仕事を再配分します。"},
            "missing_required": {"action": "correct_required_job", "reason": "必須の仕事IDを入力データと照合します。"},
            "duration": {"action": "redistribute_work", "reason": "所要時間が長い仕事を別の担当者へ移します。"},
            "route_distance": {"action": "split_route", "reason": "距離上限を超えるルートを分割します。"},
            "time_window": {"action": "change_route_order", "reason": "時間枠に収まる順番へルートを調整します。"},
        }
        adjustment_candidates = []
        for violation_type in dict.fromkeys(item["type"] for item in violations):
            candidate = candidate_by_type.get(violation_type)
            if candidate is not None:
                adjustment_candidates.append({**candidate, "violation_type": violation_type})

        adjustment_record = {
            "adjustment_id": f"adjustment-{self._hash({'jobs': jobs, 'adjustment': adjustment})[:12]}",
            "status": adjustment_status,
            "operator": str(adjustment.get("operator", "")),
            "assignments": adjustment_rows,
            "recorded": manual_plan_used,
        }
        state = (
            "accepted"
            if adjustment_status == "accepted" and manual_plan_used
            else ("adjusted" if manual_plan_used else ("violation_found" if violations else "accepted"))
        )
        risks = []
        if unassigned:
            risks.append("割当上限超過")
        if any(item["type"] == "duration" for item in violations):
            risks.append("所要時間超過")
        if any(item["type"] == "time_window" for item in violations):
            risks.append("時間枠超過")
        if any(item["type"] == "route_distance" for item in violations):
            risks.append("ルート距離超過")
        if missing_required:
            risks.append("必須の仕事が見つからない")

        optimization_summary = {
            "type": "summary",
            "objective": "距離・遅延・未割当・時間超過の重み付きコストを小さくする",
            "unassigned_jobs": unassigned,
            "missing_required_jobs": missing_required,
            "violation_count": len(violations),
            "total_cost": cost_summary["total_cost"],
            "manual_plan_used": manual_plan_used,
        }
        return {
            "summary": "優先度順に候補解を作り、担当割当、ルート、時間枠、制約違反、総コスト、人間調整を記録しました。",
            "state": state,
            "optimization_summary": optimization_summary,
            "assignments": assignments,
            "route_plan": route_plan,
            "violations": violations,
            "cost_summary": cost_summary,
            "adjustment_candidates": adjustment_candidates,
            "human_adjustment_record": adjustment_record,
            "risks": risks,
        }

    def _system44(self, data: dict[str, Any]) -> tuple[str, list[dict[str, Any]], list[str]]:
        decision = self._system44_decision(data)
        return decision["summary"], [decision["business_comparison"]], decision["risks"]

    def _system44_decision(self, data: dict[str, Any]) -> dict[str, Any]:
        variants = data.get("variant_results", {})
        variants = variants if isinstance(variants, dict) else {}
        control = variants.get("control", {})
        variant = variants.get("variant", {})
        control = control if isinstance(control, dict) else {}
        variant = variant if isinstance(variant, dict) else {}
        quality_metrics = data.get("ai_quality_metrics", {})
        quality_metrics = quality_metrics if isinstance(quality_metrics, dict) else {}
        control_quality = quality_metrics.get("control", {})
        variant_quality = quality_metrics.get("variant", {})
        control_quality = control_quality if isinstance(control_quality, dict) else {}
        variant_quality = variant_quality if isinstance(variant_quality, dict) else {}
        cost_metrics = data.get("cost_metrics", {})
        cost_metrics = cost_metrics if isinstance(cost_metrics, dict) else {}
        guardrails = data.get("guardrail_metrics", {})
        guardrails = guardrails if isinstance(guardrails, dict) else {}
        rules = data.get("decision_rules", {})
        rules = rules if isinstance(rules, dict) else {}
        control_users = int(control.get("users", 0))
        variant_users = int(variant.get("users", 0))
        control_conversions = int(control.get("conversions", 0))
        variant_conversions = int(variant.get("conversions", 0))
        control_rate = control_conversions / max(1, control_users)
        variant_rate = variant_conversions / max(1, variant_users)
        absolute_uplift = variant_rate - control_rate
        relative_uplift = absolute_uplift / max(control_rate, 0.000001)
        total_sample = control_users + variant_users
        minimum_sample = int(rules.get("minimum_total_sample", 1000))
        minimum_uplift = float(rules.get("minimum_relative_uplift", 0.05))
        maximum_latency = float(rules.get("maximum_latency_ms", 500))
        maximum_complaint = float(rules.get("maximum_complaint_rate", 0.02))
        minimum_variant_quality = float(rules.get("minimum_variant_quality", 0.85))
        maximum_variant_cost_per_conversion = float(rules.get("maximum_variant_cost_per_conversion", 160))
        latency = float(guardrails.get("latency_ms", 0))
        complaint_rate = float(guardrails.get("complaint_rate", 0))
        control_accuracy = float(control_quality.get("accuracy", 0))
        variant_accuracy = float(variant_quality.get("accuracy", 0))
        control_failures = int(control_quality.get("failure_count", 0))
        variant_failures = int(variant_quality.get("failure_count", 0))
        control_cost = float(cost_metrics.get("control_total", 0))
        variant_cost = float(cost_metrics.get("variant_total", 0))
        control_cost_per_conversion = control_cost / max(1, control_conversions)
        variant_cost_per_conversion = variant_cost / max(1, variant_conversions)

        risks = []
        if total_sample < minimum_sample:
            risks.append("サンプル不足")
        if relative_uplift < minimum_uplift:
            risks.append("改善幅不足")
        if latency > maximum_latency:
            risks.append("応答時間の条件違反")
        if complaint_rate > maximum_complaint:
            risks.append("苦情率の条件違反")
        if variant_accuracy < minimum_variant_quality:
            risks.append("AI品質の条件違反")
        if variant_cost_per_conversion > maximum_variant_cost_per_conversion:
            risks.append("成果単価の条件違反")
        automatic_decision = "rollout" if not risks else "continue_test"
        business_comparison = {
            "control_users": control_users,
            "control_conversions": control_conversions,
            "control_rate": round(control_rate, 4),
            "variant_users": variant_users,
            "variant_conversions": variant_conversions,
            "variant_rate": round(variant_rate, 4),
            "absolute_uplift": round(absolute_uplift, 4),
            "relative_uplift": round(relative_uplift, 4),
            "total_sample": total_sample,
            "minimum_sample": minimum_sample,
            "latency_ms": latency,
            "maximum_latency_ms": maximum_latency,
            "complaint_rate": complaint_rate,
            "maximum_complaint_rate": maximum_complaint,
            "decision": automatic_decision,
        }
        quality_comparison = {
            "control_accuracy": control_accuracy,
            "variant_accuracy": variant_accuracy,
            "accuracy_difference": round(variant_accuracy - control_accuracy, 4),
            "minimum_variant_quality": minimum_variant_quality,
            "control_failure_count": control_failures,
            "variant_failure_count": variant_failures,
            "quality_condition_met": variant_accuracy >= minimum_variant_quality,
        }
        cost_comparison = {
            "control_total": control_cost,
            "variant_total": variant_cost,
            "control_cost_per_conversion": round(control_cost_per_conversion, 2),
            "variant_cost_per_conversion": round(variant_cost_per_conversion, 2),
            "cost_per_conversion_difference": round(variant_cost_per_conversion - control_cost_per_conversion, 2),
            "maximum_variant_cost_per_conversion": maximum_variant_cost_per_conversion,
            "cost_condition_met": variant_cost_per_conversion <= maximum_variant_cost_per_conversion,
        }
        guardrail_summary = {
            "latency_ms": latency,
            "maximum_latency_ms": maximum_latency,
            "latency_condition_met": latency <= maximum_latency,
            "complaint_rate": complaint_rate,
            "maximum_complaint_rate": maximum_complaint,
            "complaint_condition_met": complaint_rate <= maximum_complaint,
        }

        failure_cases = data.get("failure_cases", [])
        failure_cases = failure_cases if isinstance(failure_cases, list) else []
        failure_classifications = []
        for item in failure_cases:
            if not isinstance(item, dict):
                continue
            count = max(0, int(item.get("count", 0)))
            failure_classifications.append({
                "variant": str(item.get("variant", "")),
                "category": str(item.get("category", "unclassified")),
                "count": count,
                "requires_improvement": count > 0,
            })

        improvement_candidates = []
        for item in failure_classifications:
            if item["requires_improvement"]:
                improvement_candidates.append({
                    "source": item["category"],
                    "action": f"{item['category']}の原因を確認し、次の実験条件へ反映する",
                    "priority": "high" if item["count"] >= 5 else "medium",
                })
        risk_actions = {
            "サンプル不足": "対象人数を増やして再評価する",
            "改善幅不足": "変更内容と主要KPIを見直して次の実験を設計する",
            "応答時間の条件違反": "遅い処理を特定し、応答時間を改善して再評価する",
            "苦情率の条件違反": "苦情の内容を分類し、安全側の条件を見直す",
            "AI品質の条件違反": "失敗分類を基にAI品質を改善して再評価する",
            "成果単価の条件違反": "実行コストを分解し、成果単価を下げる方法を検討する",
        }
        for risk in risks:
            improvement_candidates.append({"source": risk, "action": risk_actions[risk], "priority": "high"})

        review = data.get("human_review_result", {})
        review = review if isinstance(review, dict) else {}
        review_status = str(review.get("status", "pending"))
        if review_status not in {"pending", "decided", "archived"}:
            review_status = "pending"
        reviewer = str(review.get("reviewer", ""))
        human_decision = str(review.get("decision", ""))
        recorded = review_status in {"decided", "archived"} and bool(human_decision)
        memo_id = f"experiment-{self._hash({'input': data, 'automatic_decision': automatic_decision})[:12]}"
        decision_memo = {
            "memo_id": memo_id,
            "status": review_status,
            "reviewer": reviewer,
            "automatic_decision": automatic_decision,
            "decision": human_decision,
            "reason": str(review.get("reason", "")),
            "improvement_action": str(review.get("improvement_action", "")),
            "next_experiment": str(review.get("next_experiment", "")),
            "recorded": recorded,
        }
        state = "archived" if review_status == "archived" and recorded else ("decided" if recorded else "analyzed")
        return {
            "summary": "事業KPI、AI品質、コスト、応答時間、失敗分類を比較し、改善候補と意思決定記録を作成しました。",
            "state": state,
            "business_comparison": business_comparison,
            "quality_comparison": quality_comparison,
            "cost_comparison": cost_comparison,
            "guardrail_summary": guardrail_summary,
            "failure_classifications": failure_classifications,
            "improvement_candidates": improvement_candidates,
            "decision_memo": decision_memo,
            "risks": risks,
        }

    def _generic(self, data: dict[str, Any]) -> tuple[str, list[dict[str, Any]], list[str]]:
        return "入力から教材用の判断結果を生成しました。", [{"input_keys": sorted(data)}], []

    def _final_state(self, system: EnterpriseAiSystem, risks: list[str]) -> str:
        if risks:
            for state in ("escalated", "reviewed", "flagged"):
                if state in system.state_flow:
                    return state
        for state in ("executed", "displayed", "completed", "processed", "exported", "accepted", "cleared", "decided", "approved"):
            if state in system.state_flow:
                return state
        return system.state_flow[-1]

    def _domain_audit_log(
        self,
        system: EnterpriseAiSystem,
        run_id: str,
        result: dict[str, Any],
    ) -> list[dict[str, Any]]:
        if system.system_id == "system37":
            transaction = result.get("transaction_record", {})
            transaction = transaction if isinstance(transaction, dict) else {}
            state = str(result.get("state", ""))
            action_by_state = {
                "hearing": "additional_information_requested",
                "confirming": "transaction_confirmation_requested",
                "executed": "transaction_executed",
                "changed": "transaction_changed",
                "cancelled": "transaction_cancelled",
                "escalated": "transaction_blocked",
            }
            now = datetime.now(timezone.utc).isoformat()
            return [
                {
                    "timestamp": now,
                    "run_id": run_id,
                    "system_id": system.system_id,
                    "actor": "system",
                    "action": "transaction_decision_recorded",
                    "reason": str(transaction.get("reason", "取引判断を記録しました。")),
                    "input_hash": str(transaction.get("transaction_id", "")),
                },
                {
                    "timestamp": now,
                    "run_id": run_id,
                    "system_id": system.system_id,
                    "actor": "system",
                    "action": action_by_state.get(state, "transaction_state_recorded"),
                    "reason": f"取引状態を{state}として記録しました。",
                    "input_hash": str(transaction.get("transaction_id", "")),
                },
            ]

        if system.system_id == "system40":
            proposal = result.get("replenishment_proposal", {})
            proposal = proposal if isinstance(proposal, dict) else {}
            now = datetime.now(timezone.utc).isoformat()
            entries = [{
                "timestamp": now,
                "run_id": run_id,
                "system_id": system.system_id,
                "actor": "system",
                "action": "replenishment_proposal_recorded",
                "reason": f"補充提案を承認状態{proposal.get('approval_status', '')}で記録しました。",
                "input_hash": str(proposal.get("proposal_id", "")),
            }]
            if proposal.get("approval_status") in {"approved", "rejected"}:
                entries.append({
                    "timestamp": now,
                    "run_id": run_id,
                    "system_id": system.system_id,
                    "actor": str(proposal.get("approver", "")) or "learner",
                    "action": "replenishment_approval_recorded",
                    "reason": f"補充提案を{proposal.get('approval_status')}として記録しました。",
                    "input_hash": str(proposal.get("proposal_id", "")),
                })
            if proposal.get("order_candidate_recorded"):
                entries.append({
                    "timestamp": now,
                    "run_id": run_id,
                    "system_id": system.system_id,
                    "actor": "system",
                    "action": "order_candidate_recorded",
                    "reason": "承認済みの補充量を発注候補として記録しました。",
                    "input_hash": str(proposal.get("proposal_id", "")),
                })
            return entries

        if system.system_id == "system41":
            review_record = result.get("human_review_record", {})
            review_record = review_record if isinstance(review_record, dict) else {}
            confirmation_queue = result.get("confirmation_queue", [])
            confirmation_queue = confirmation_queue if isinstance(confirmation_queue, list) else []
            now = datetime.now(timezone.utc).isoformat()
            entries = [{
                "timestamp": now,
                "run_id": run_id,
                "system_id": system.system_id,
                "actor": "system",
                "action": "multimodal_detection_recorded",
                "reason": "画像、OCR、商品マスタ、センサーの照合結果を記録しました。",
                "input_hash": str(review_record.get("review_id", "")),
            }]
            if confirmation_queue:
                entries.append({
                    "timestamp": now,
                    "run_id": run_id,
                    "system_id": system.system_id,
                    "actor": "system",
                    "action": "human_review_requested",
                    "reason": f"{len(confirmation_queue)}件を確認待ち一覧へ記録しました。",
                    "input_hash": str(review_record.get("review_id", "")),
                })
            if review_record.get("recorded"):
                entries.append({
                    "timestamp": now,
                    "run_id": run_id,
                    "system_id": system.system_id,
                    "actor": str(review_record.get("reviewer", "")) or "learner",
                    "action": "human_review_recorded",
                    "reason": f"人間確認結果を{review_record.get('status', '')}として記録しました。",
                    "input_hash": str(review_record.get("review_id", "")),
                })
            return entries

        if system.system_id == "system42":
            alert = result.get("alert", {})
            alert = alert if isinstance(alert, dict) else {}
            confirmation = result.get("confirmation_record", {})
            confirmation = confirmation if isinstance(confirmation, dict) else {}
            evaluation = result.get("evaluation_record", {})
            evaluation = evaluation if isinstance(evaluation, dict) else {}
            now = datetime.now(timezone.utc).isoformat()
            entries = [{
                "timestamp": now,
                "run_id": run_id,
                "system_id": system.system_id,
                "actor": "system",
                "action": "risk_decision_recorded",
                "reason": f"リスク判定を{alert.get('action', '')}として記録しました。",
                "input_hash": str(alert.get("alert_id", "")),
            }]
            if alert.get("created"):
                entries.append({
                    "timestamp": now,
                    "run_id": run_id,
                    "system_id": system.system_id,
                    "actor": "system",
                    "action": "risk_alert_recorded",
                    "reason": f"リスク点{alert.get('risk_score', '')}のアラートを記録しました。",
                    "input_hash": str(alert.get("alert_id", "")),
                })
            if confirmation.get("recorded"):
                entries.append({
                    "timestamp": now,
                    "run_id": run_id,
                    "system_id": system.system_id,
                    "actor": str(confirmation.get("reviewer", "")) or "learner",
                    "action": "risk_review_recorded",
                    "reason": f"確認結果を{evaluation.get('classification', '')}として記録しました。",
                    "input_hash": str(alert.get("alert_id", "")),
                })
            return entries

        if system.system_id == "system43":
            optimization = result.get("optimization_summary", {})
            optimization = optimization if isinstance(optimization, dict) else {}
            adjustment = result.get("human_adjustment_record", {})
            adjustment = adjustment if isinstance(adjustment, dict) else {}
            now = datetime.now(timezone.utc).isoformat()
            entries = [{
                "timestamp": now,
                "run_id": run_id,
                "system_id": system.system_id,
                "actor": "system",
                "action": "optimization_plan_recorded",
                "reason": f"制約違反{optimization.get('violation_count', 0)}件、総コスト{optimization.get('total_cost', 0)}の候補解を記録しました。",
                "input_hash": self._hash({"optimization": optimization}),
            }]
            if adjustment.get("recorded"):
                entries.append({
                    "timestamp": now,
                    "run_id": run_id,
                    "system_id": system.system_id,
                    "actor": str(adjustment.get("operator", "")) or "learner",
                    "action": "human_adjustment_recorded",
                    "reason": f"人間調整結果を{adjustment.get('status', '')}として記録しました。",
                    "input_hash": str(adjustment.get("adjustment_id", "")),
                })
            return entries

        if system.system_id == "system44":
            comparison = result.get("recommendations", [])
            comparison = comparison[0] if isinstance(comparison, list) and comparison else {}
            comparison = comparison if isinstance(comparison, dict) else {}
            memo = result.get("decision_memo", {})
            memo = memo if isinstance(memo, dict) else {}
            failures = result.get("failure_classifications", [])
            failures = failures if isinstance(failures, list) else []
            now = datetime.now(timezone.utc).isoformat()
            entries = [{
                "timestamp": now,
                "run_id": run_id,
                "system_id": system.system_id,
                "actor": "system",
                "action": "experiment_evaluation_recorded",
                "reason": f"A/B差{comparison.get('absolute_uplift', 0)}、失敗分類{len(failures)}件の評価結果を記録しました。",
                "input_hash": str(memo.get("memo_id", "")),
            }]
            if memo.get("recorded"):
                entries.append({
                    "timestamp": now,
                    "run_id": run_id,
                    "system_id": system.system_id,
                    "actor": str(memo.get("reviewer", "")) or "learner",
                    "action": "experiment_decision_recorded",
                    "reason": f"実験の意思決定を{memo.get('decision', '')}として記録しました。",
                    "input_hash": str(memo.get("memo_id", "")),
                })
            if memo.get("status") == "archived" and memo.get("recorded"):
                entries.append({
                    "timestamp": now,
                    "run_id": run_id,
                    "system_id": system.system_id,
                    "actor": str(memo.get("reviewer", "")) or "learner",
                    "action": "experiment_archived",
                    "reason": "評価結果、失敗分類、改善内容、意思決定理由を保存しました。",
                    "input_hash": str(memo.get("memo_id", "")),
                })
            return entries

        if system.system_id != "system39":
            return []
        support_case = result.get("support_case", {})
        support_case = support_case if isinstance(support_case, dict) else {}
        procedure = support_case.get("procedure_result", {})
        ticket = support_case.get("ticket", {})
        handoff = support_case.get("handoff_summary", {})
        now = datetime.now(timezone.utc).isoformat()
        entries = [
            {
                "timestamp": now,
                "run_id": run_id,
                "system_id": system.system_id,
                "actor": "system",
                "action": "support_procedure_recorded",
                "reason": f"業務手続きの受付結果を記録しました: {procedure.get('status', '')}",
                "input_hash": str(support_case.get("case_id", "")),
            },
            {
                "timestamp": now,
                "run_id": run_id,
                "system_id": system.system_id,
                "actor": "system",
                "action": "support_ticket_recorded",
                "reason": f"問い合わせチケットを記録しました: {ticket.get('status', '')}",
                "input_hash": str(ticket.get("ticket_id", "")),
            },
        ]
        if isinstance(handoff, dict) and handoff.get("required"):
            entries.append(
                {
                    "timestamp": now,
                    "run_id": run_id,
                    "system_id": system.system_id,
                    "actor": "system",
                    "action": "support_handoff_recorded",
                    "reason": str(handoff.get("reason", "")),
                    "input_hash": str(support_case.get("case_id", "")),
                }
            )
        return entries

    def _audit_log(
        self,
        system: EnterpriseAiSystem,
        run_id: str,
        operator: str,
        input_data: dict[str, Any],
        decision_source: str,
    ) -> list[dict[str, Any]]:
        now = datetime.now(timezone.utc).isoformat()
        entries = [
            {
                "timestamp": now,
                "run_id": run_id,
                "system_id": system.system_id,
                "actor": operator,
                "action": "request_received",
                "reason": "教材入力を受け付けました。",
                "input_hash": self._hash(input_data),
            }
        ]
        entries.append(
            {
                "timestamp": now,
                "run_id": run_id,
                "system_id": system.system_id,
                "actor": "system",
                "action": "decision_generated",
                "reason": (
                    "LM Studio のOpenAI互換APIで判断しました。"
                    if decision_source == "lmstudio"
                    else "deterministic mock engine で判断しました。"
                ),
                "input_hash": self._hash(input_data),
            }
        )
        entries.append(
            {
                "timestamp": now,
                "run_id": run_id,
                "system_id": system.system_id,
                "actor": "system",
                "action": "execution_completed",
                "reason": "監査ログとKPIを生成しました。",
                "input_hash": self._hash(input_data),
            }
        )
        return entries

    def _kpi_snapshot(self, system: EnterpriseAiSystem, result: dict[str, Any]) -> dict[str, Any]:
        values = {name: round((index + 1) / (len(system.kpi_definitions) + 1), 3) for index, name in enumerate(system.kpi_definitions)}
        if system.system_id == "system37":
            confirmation = result.get("confirmation", {})
            confirmation = confirmation if isinstance(confirmation, dict) else {}
            state = str(result.get("state", ""))
            values.update({
                "execution_success_rate": 1.0 if state in {"executed", "changed", "cancelled"} else 0.0,
                "confirmation_rate": 1.0 if confirmation.get("confirmed") else 0.0,
                "cancellation_rate": 1.0 if state == "cancelled" else 0.0,
                "policy_violation_count": len(result.get("risk_flags", [])),
                "average_response_ms": 128,
            })
        if system.system_id == "system42":
            evaluation = result.get("evaluation_record", {})
            evaluation = evaluation if isinstance(evaluation, dict) else {}
            confirmation = result.get("confirmation_record", {})
            confirmation = confirmation if isinstance(confirmation, dict) else {}
            classification = evaluation.get("classification")
            values.update({
                "detection_rate": 1.0 if classification == "correct_detection" else 0.0,
                "false_positive_rate": 1.0 if classification == "false_positive" else 0.0,
                "processing_ms": 128,
                "human_review_rate": 1.0 if confirmation.get("recorded") else 0.0,
            })
        if system.system_id == "system43":
            optimization = result.get("optimization_summary", {})
            optimization = optimization if isinstance(optimization, dict) else {}
            adjustment = result.get("human_adjustment_record", {})
            adjustment = adjustment if isinstance(adjustment, dict) else {}
            values.update({
                "violation_count": int(optimization.get("violation_count", 0)),
                "optimization_cost": float(optimization.get("total_cost", 0)),
                "processing_ms": 132,
                "human_adjustment_rate": 1.0 if adjustment.get("recorded") else 0.0,
            })
        if system.system_id == "system44":
            comparison = result.get("recommendations", [])
            comparison = comparison[0] if isinstance(comparison, list) and comparison else {}
            comparison = comparison if isinstance(comparison, dict) else {}
            memo = result.get("decision_memo", {})
            memo = memo if isinstance(memo, dict) else {}
            values.update({
                "experiment_count": 1,
                "ab_difference": float(comparison.get("absolute_uplift", 0)),
                "kpi_improvement_rate": float(comparison.get("relative_uplift", 0)),
                "decision_completion_rate": 1.0 if memo.get("recorded") else 0.0,
            })
        values["risk_flag_count"] = len(result.get("risk_flags", []))
        values["latency_ms"] = 120 + len(system.system_id)
        return values

    def _mask_secrets(self, value: Any) -> Any:
        if isinstance(value, dict):
            return {key: ("***MASKED***" if any(token in key.lower() for token in SECRET_KEYS) else self._mask_secrets(item)) for key, item in value.items()}
        if isinstance(value, list):
            return [self._mask_secrets(item) for item in value]
        return value

    def _run_id(self, prefix: str, payload: dict[str, Any]) -> str:
        digest = self._hash(payload)[:10]
        return f"{prefix}-{digest}"

    def _hash(self, payload: dict[str, Any]) -> str:
        raw = json.dumps(payload, ensure_ascii=False, sort_keys=True, default=str)
        return hashlib.sha1(raw.encode("utf-8")).hexdigest()


enterprise_ai_service = EnterpriseAiService(
    system37_run_file=get_settings().system37_run_file,
    system38_run_file=get_settings().system38_run_file,
    system39_run_file=get_settings().system39_run_file,
    system40_run_file=get_settings().system40_run_file,
    system41_run_file=get_settings().system41_run_file,
    system42_run_file=get_settings().system42_run_file,
    system43_run_file=get_settings().system43_run_file,
    system44_run_file=get_settings().system44_run_file,
)
