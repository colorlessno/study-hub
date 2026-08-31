const fs = require("fs");
const path = require("path");

const fixturePath = process.argv[2];
const expectedCase = process.argv[3];

if (!fixturePath || !expectedCase) {
  console.error("Usage: node checks/check_task_fixture.js <task-fixture.json> <success|needs_approval|missing_context>");
  process.exit(2);
}

const fixture = JSON.parse(fs.readFileSync(path.resolve(fixturePath), "utf8"));
const requested = Array.isArray(fixture.requested_operations) ? fixture.requested_operations : [];
const approvalOps = new Set(["ファイル変更", "ファイル削除", "コマンド実行", "外部送信", "依存追加", "長時間実行"]);
const hasApprovalOp = requested.some((op) => approvalOps.has(op));
const hasGoal = typeof fixture.goal === "string" && fixture.goal.trim().length > 0;
const hasOutputs = Array.isArray(fixture.expected_outputs) && fixture.expected_outputs.length > 0;

if (expectedCase === "success") {
  if (!hasGoal || !hasOutputs || hasApprovalOp) {
    console.error("success fixture must have goal, outputs, and no approval-required operations");
    process.exit(1);
  }
} else if (expectedCase === "needs_approval") {
  if (!hasGoal || !hasApprovalOp) {
    console.error("needs_approval fixture must have goal and approval-required operations");
    process.exit(1);
  }
} else if (expectedCase === "missing_context") {
  if (hasGoal && hasOutputs) {
    console.error("missing_context fixture must lack goal or expected outputs");
    process.exit(1);
  }
} else {
  console.error(`unknown expected case: ${expectedCase}`);
  process.exit(2);
}

console.log(`task fixture check passed: ${fixturePath} (${expectedCase})`);
