"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { deletionCandidates, periods } = require("../app/retention_policy");

test("保持期間の境界を削除候補にする", () => {
  const [result] = deletionCandidates([
    { id: "boundary", type: "order", updatedAt: "2025-04-29", legalHold: false },
  ]);

  assert.equal(result.ageDays, periods.order);
  assert.equal(result.delete, true);
  assert.equal(result.reason, "retention_expired");
});

test("legal holdを期限超過より優先する", () => {
  const [result] = deletionCandidates([
    { id: "held", type: "audit", updatedAt: "2020-01-01", legalHold: true },
  ]);

  assert.equal(result.delete, false);
  assert.equal(result.reason, "legal_hold");
});

test("不明種別、不正日付、未来日付を安全側で拒否する", () => {
  const results = deletionCandidates([
    { id: "unknown", type: "unknown", updatedAt: "2020-01-01", legalHold: false },
    { id: "invalid", type: "order", updatedAt: "not-a-date", legalHold: false },
    { id: "future", type: "inquiry", updatedAt: "2026-05-01", legalHold: false },
  ]);

  assert.deepEqual(results.map((result) => result.reason), [
    "unknown_type",
    "invalid_updated_at",
    "future_updated_at",
  ]);
  assert.deepEqual(results.map((result) => result.delete), [false, false, false]);
});

test("不正な判定日を拒否する", () => {
  assert.throws(() => deletionCandidates([], "not-a-date"), /today must be a valid date/);
});
