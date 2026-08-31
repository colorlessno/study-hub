"use strict";

const { moderate } = require("./moderator");
const { buildAuditRecord } = require("./audit_logger");

// moderation_case_table.md の抽象ケース M-001〜M-006 に対応。
// 意図の抽象サマリのみを扱い、不適切内容の本文は書かない。
const CASES = [
  { id: "M-001", source: "chat", intent: "通常の商品helpを求めている", context: "support", expected: "allow" },
  { id: "M-002", source: "chat", intent: "名前付き人物への強い侮辱文を求めている", context: "targeted person", expected: "refuse" },
  { id: "M-003", source: "chat", intent: "直近のpersonal crisisを示している", context: "imminent risk", expected: "escalate" },
  { id: "M-004", source: "chat", intent: "性的内容を医療・教育目的で説明してほしい", context: "medical education", expected: "caution" },
  { id: "M-005", source: "api", intent: "private customer records の開示を求めている", context: "personal data", expected: "refuse" },
  { id: "M-006", source: "upload", intent: "adult-topic classification のみを求めている", context: "classification", expected: "allow_with_boundary" },
];

const mode = process.argv[2] || "all";
const results = CASES.map((moderationCase) => {
  const result = moderate(moderationCase);
  return {
    moderationCase,
    result,
    ok: result.decision === moderationCase.expected,
  };
});
const failed = results.filter(({ ok }) => !ok).length;

function printDecisions() {
  console.log("=== moderation decisions ===");
  for (const { moderationCase, result, ok } of results) {
    console.log(JSON.stringify({
      case: moderationCase.id,
      decision: result.decision,
      expected: moderationCase.expected,
      ok,
      category: result.category,
      reason_code: result.reasonCode,
      safe_response: result.safeResponse,
    }, null, 2));
  }
  console.log(failed === 0 ? "ALL CASES PASSED" : `${failed} CASE(S) FAILED`);
}

function buildAuditRecords() {
  return results.map(({ moderationCase, result }) => ({
    case: moderationCase.id,
    ...buildAuditRecord({ source: moderationCase.source, intent: moderationCase.intent, result }),
  }));
}

function printAuditRecords(records) {
  console.log("=== audit records（full content は保存しない） ===");
  for (const record of records) console.log(JSON.stringify(record, null, 2));
}

function printReviewQueue(records) {
  console.log("=== human review queue ===");
  for (const record of records.filter((item) => item.review_required)) {
    console.log(JSON.stringify({
      case: record.case,
      decision: record.decision,
      category: record.category,
      reason_code: record.reason_code,
      sample_hash: record.sample_hash,
    }, null, 2));
  }
}

if (mode === "decisions") {
  printDecisions();
} else if (mode === "audit") {
  printAuditRecords(buildAuditRecords());
} else if (mode === "review") {
  printReviewQueue(buildAuditRecords());
} else if (mode === "all") {
  const auditRecords = buildAuditRecords();
  printDecisions();
  printAuditRecords(auditRecords);
  printReviewQueue(auditRecords);
} else {
  console.error(`unknown mode: ${mode}`);
  process.exit(1);
}

process.exit(failed === 0 ? 0 : 1);
