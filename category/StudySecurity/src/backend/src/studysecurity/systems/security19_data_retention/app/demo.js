const assert = require("assert");
const { deletionCandidates } = require("./retention_policy");

const records = [
  { id: "o-1", type: "order", updatedAt: "2024-01-01", legalHold: false },
  { id: "i-1", type: "inquiry", updatedAt: "2026-01-01", legalHold: false },
  { id: "a-1", type: "audit", updatedAt: "2020-01-01", legalHold: true },
  { id: "o-boundary", type: "order", updatedAt: "2025-04-29", legalHold: false },
  { id: "x-1", type: "unknown", updatedAt: "2020-01-01", legalHold: false },
];

const results = deletionCandidates(records);
assert.deepStrictEqual(results.map((result) => result.reason), [
  "retention_expired",
  "within_retention",
  "legal_hold",
  "retention_expired",
  "unknown_type",
]);
assert.strictEqual(results[3].ageDays, 365);

const safetyRecords = [
  { id: "invalid-date", type: "order", updatedAt: "not-a-date", legalHold: false },
  { id: "future-date", type: "inquiry", updatedAt: "2026-05-01", legalHold: false },
];
const safetyResults = deletionCandidates(safetyRecords);
assert.deepStrictEqual(safetyResults.map((result) => result.reason), [
  "invalid_updated_at",
  "future_updated_at",
]);
assert.deepStrictEqual(safetyResults.map((result) => result.delete), [false, false]);

const mode = process.argv[2] || "full";

if (mode === "full") {
  console.log(JSON.stringify(results, null, 2));
} else if (mode === "summary") {
  const summary = results.reduce((counts, result) => {
    counts[result.reason] = (counts[result.reason] || 0) + 1;
    return counts;
  }, {});
  console.log(JSON.stringify(summary, null, 2));
} else if (mode === "deletions") {
  console.log(JSON.stringify(results.filter((result) => result.delete), null, 2));
} else if (mode === "safety") {
  console.log(JSON.stringify(safetyResults, null, 2));
} else {
  throw new Error(`unknown mode: ${mode}`);
}
