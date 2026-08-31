"use strict";

const crypto = require("crypto");
const { REVIEW_REQUIRED_DECISIONS } = require("./policy");

let seq = 0;

// audit_log_schema.md の最小項目に対応。
// full content は保存せず、sample_hash（sha256）と短い category / reason だけを残す（保存最小化の原則）。
function buildAuditRecord({ source, intent, result }) {
  seq += 1;
  return {
    event_id: `mod-${String(seq).padStart(4, "0")}`,
    occurred_at: new Date().toISOString(),
    source: source || "unknown",
    category: result.category,
    decision: result.decision,
    reason_code: result.reasonCode,
    confidence: result.confidence,
    sample_hash: crypto.createHash("sha256").update(String(intent)).digest("hex").slice(0, 16),
    review_required: REVIEW_REQUIRED_DECISIONS.includes(result.decision),
  };
}

function resetSequence() {
  seq = 0;
}

module.exports = { buildAuditRecord, resetSequence };
