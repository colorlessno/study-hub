const fs = require("fs");
const path = require("path");

const file = process.argv[2];
const startedAt = new Date();

function finish(result, message, failureReason = "", rerunCondition = "none") {
  const finishedAt = new Date();
  const checkName = "forbidden_operation";
  const runId = `${checkName}-${process.pid}-${startedAt.getTime()}`;
  const logDirectory = path.resolve(__dirname, "..", "samples", "run_logs");
  const logFile = path.join(logDirectory, `${runId}.json`);
  const record = {
    run_id: runId,
    task_id: file ? path.basename(file, path.extname(file)) : "",
    fixture: file || "",
    started_at: startedAt.toISOString(),
    ended_at: finishedAt.toISOString(),
    checks: [{ name: checkName, result, message }],
    result,
    failure_reason: failureReason,
    rerun_condition: rerunCondition,
    feedback_memo: result === "passed"
      ? "許可操作の境界を維持し、同じfixtureで再確認する。"
      : "禁止操作を除くか、人間の承認が必要な処理として分離する。",
    residual_risk: "文字列検査で検出できない危険な意図は、人間が別途確認する。",
    log_path: path.relative(process.cwd(), logFile).replaceAll("\\", "/"),
  };

  fs.mkdirSync(logDirectory, { recursive: true });
  fs.writeFileSync(logFile, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(record, null, 2));
  process.exitCode = result === "passed" ? 0 : 1;
}

function main() {
  if (!file) {
    finish(
      "failed",
      "fixture path is required",
      "検証対象のfixtureが指定されていない。",
      "fixtureのパスを指定する。",
    );
    return;
  }

  let text;
  try {
    text = fs.readFileSync(file, "utf8").toLowerCase();
  } catch (error) {
    finish(
      "failed",
      "fixture could not be read",
      error instanceof Error ? error.message : String(error),
      "fixtureのパスとUTF-8の内容を確認する。",
    );
    return;
  }

  const forbidden = ["delete_arbitrary_path", "external_send", "secret", "password"];
  const found = forbidden.filter((word) => text.includes(word));

  if (found.length > 0) {
    const message = `forbidden operation found: ${found.join(", ")}`;
    finish(
      "failed",
      message,
      message,
      `禁止操作（${found.join("、")}）を除くか、承認対象として分離する。`,
    );
    return;
  }

  finish("passed", "forbidden operation check passed");
}

main();
