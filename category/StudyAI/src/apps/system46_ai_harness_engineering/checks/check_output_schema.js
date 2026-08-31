const fs = require("fs");
const path = require("path");

const file = process.argv[2];
const startedAt = new Date();

function finish(result, message, failureReason = "", rerunCondition = "none") {
  const finishedAt = new Date();
  const checkName = "output_schema";
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
      ? "期待する出力形式を維持し、同じ出力例で再確認する。"
      : "不足している見出しを出力へ追加してから再実行する。",
    residual_risk: "見出し内の内容の正確性は、この形式検証だけでは判定しない。",
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
      "output path is required",
      "検証対象の出力ファイルが指定されていない。",
      "Markdown出力のパスを指定する。",
    );
    return;
  }

  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (error) {
    finish(
      "failed",
      "output could not be read",
      error instanceof Error ? error.message : String(error),
      "出力ファイルのパスとUTF-8の内容を確認する。",
    );
    return;
  }

  const required = ["## 指摘", "## 要約", "## 残リスク"];
  const missing = required.filter((section) => !text.includes(section));

  if (missing.length > 0) {
    const message = `missing sections: ${missing.join(", ")}`;
    finish(
      "failed",
      message,
      message,
      `出力へ不足見出し（${missing.join("、")}）を追加する。`,
    );
    return;
  }

  finish("passed", "output schema check passed");
}

main();
