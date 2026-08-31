const fs = require("fs");
const path = require("path");

const filePath = process.argv[2];
const startedAt = new Date();

function finish(result, message, failureReason = "", rerunCondition = "none") {
  const finishedAt = new Date();
  const checkName = "task_fixture";
  const runId = `${checkName}-${process.pid}-${startedAt.getTime()}`;
  const logDirectory = path.resolve(__dirname, "..", "samples", "run_logs");
  const logFile = path.join(logDirectory, `${runId}.json`);
  const record = {
    run_id: runId,
    task_id: filePath ? path.basename(filePath, path.extname(filePath)) : "",
    fixture: filePath || "",
    started_at: startedAt.toISOString(),
    ended_at: finishedAt.toISOString(),
    checks: [{ name: checkName, result, message }],
    result,
    failure_reason: failureReason,
    rerun_condition: rerunCondition,
    feedback_memo: result === "passed"
      ? "入力契約を維持し、同じfixtureで再確認する。"
      : "fixtureの入力契約を修正してから同じ検証を再実行する。",
    residual_risk: "入力項目の意味とAI出力の品質は、この構造検証だけでは判定しない。",
    log_path: path.relative(process.cwd(), logFile).replaceAll("\\", "/"),
  };

  fs.mkdirSync(logDirectory, { recursive: true });
  fs.writeFileSync(logFile, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(record, null, 2));
  process.exitCode = result === "passed" ? 0 : 1;
}

function main() {
  if (!filePath) {
    finish(
      "failed",
      "fixture path is required",
      "検証対象のfixtureが指定されていない。",
      "fixtureのパスを指定する。",
    );
    return;
  }

  let fixture;
  try {
    fixture = JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
  } catch (error) {
    finish(
      "failed",
      "fixture could not be read as JSON",
      error instanceof Error ? error.message : String(error),
      "fixtureをUTF-8の正しいJSONへ修正する。",
    );
    return;
  }

  const required = ["task_goal", "target", "expected_output", "allowed_actions"];
  const missing = required.filter((field) => !(field in fixture));

  if (missing.length > 0) {
    const message = `missing required fields: ${missing.join(", ")}`;
    finish(
      "failed",
      message,
      message,
      `fixtureへ不足項目（${missing.join("、")}）を追加する。`,
    );
    return;
  }

  if (!Array.isArray(fixture.allowed_actions) || fixture.allowed_actions.length === 0) {
    const message = "allowed_actions must be a non-empty array";
    finish(
      "failed",
      message,
      message,
      "allowed_actionsへ許可する操作を1件以上指定する。",
    );
    return;
  }

  finish("passed", `task fixture check passed: ${filePath}`);
}

main();
