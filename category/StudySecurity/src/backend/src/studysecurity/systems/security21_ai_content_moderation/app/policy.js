"use strict";

// content safety taxonomy（doc/learning_notes/security21_ai_content_moderation/docs/content_safety_taxonomy.md に対応）
const CATEGORIES = Object.freeze({
  SAFE: "safe",
  SEXUAL: "sexual_nsfw",
  VIOLENCE: "violence",
  SELF_HARM: "self_harm",
  PRIVACY: "privacy",
  HARASSMENT: "hate_harassment",
  ILLEGAL: "illegal_activity",
});

// 判定レベル（詳細設計 3. 判定レベル設計に対応）
const DECISIONS = Object.freeze({
  ALLOW: "allow",
  ALLOW_WITH_BOUNDARY: "allow_with_boundary",
  CAUTION: "caution",
  REFUSE: "refuse",
  ESCALATE: "escalate",
});

// 安定した policy reason code（audit_log_schema.md の reason_code に対応）
const REASON_CODES = Object.freeze({
  NO_RESTRICTED_INTENT: "no_restricted_intent",
  EXPLICIT_CONTENT_REQUEST: "explicit_content_request",
  CLASSIFICATION_ONLY: "classification_only_boundary",
  EDUCATIONAL_CONTEXT: "educational_or_medical_context",
  TARGETED_ABUSE: "targeted_person_abuse",
  PROTECTED_DATA_REQUEST: "protected_data_request",
  IMMINENT_RISK: "imminent_self_harm_risk",
  HARM_INSTRUCTION: "harm_instruction_request",
  ILLEGAL_SUPPORT: "illegal_activity_support",
});

// user-facing safe responses（docs/safe_response_examples.md に対応）
const SAFE_RESPONSES = Object.freeze({
  [DECISIONS.ALLOW]: null,
  [DECISIONS.ALLOW_WITH_BOUNDARY]:
    "policy category を高レベルに説明できますが、明示的な詳細は再掲しません。",
  [DECISIONS.CAUTION]:
    "この話題は文脈に注意が必要です。安全な範囲に限定して回答します。",
  [DECISIONS.REFUSE]:
    "その依頼には対応できません。敬意があり、policyに沿った表現へ言い換えることなら手伝えます。",
  [DECISIONS.ESCALATE]:
    "緊急性がありそうです。今すぐ適切な緊急窓口またはsupport resourceへ連絡してください。その間、一般的なsupport stepsなら案内できます。",
});

// escalate / refuse は human review 必須（docs/escalation_notes.md に対応）
const REVIEW_REQUIRED_DECISIONS = Object.freeze([
  DECISIONS.REFUSE,
  DECISIONS.ESCALATE,
]);

module.exports = { CATEGORIES, DECISIONS, REASON_CODES, SAFE_RESPONSES, REVIEW_REQUIRED_DECISIONS };
