const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const appRoot = path.resolve(__dirname, "..");
const mode = process.argv[2] ?? "mock";
const fixtureFile = path.resolve(process.argv[3] ?? path.join(appRoot, "fixtures", "task_success.json"));
const baseUrl = (process.env.LM_STUDIO_BASE_URL ?? "http://127.0.0.1:5858").replace(/\/+$/, "");
const requestTimeoutMs = Number(process.env.LM_STUDIO_TIMEOUT_MS ?? "180000");
const maxTokens = Number(process.env.LM_STUDIO_MAX_TOKENS ?? "1200");
const roleCatalog = JSON.parse(fs.readFileSync(path.join(appRoot, "fixtures", "role_catalog.json"), "utf8"));
const sharedMemory = fs.readFileSync(path.join(appRoot, "fixtures", "shared_memory.md"), "utf8");
const task = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));

const approvalOperations = new Set(["ファイル変更", "ファイル削除", "コマンド実行", "外部送信", "依存追加", "長時間実行"]);
const forbiddenOperations = new Set(["OS設定変更", "秘密情報利用"]);
const requestedOperations = Array.isArray(task.requested_operations) ? task.requested_operations : [];
const approvalRequired = requestedOperations.filter((operation) => approvalOperations.has(operation));
const forbidden = requestedOperations.filter((operation) => forbiddenOperations.has(operation));
const hasContext = typeof task.goal === "string" && task.goal.trim().length > 0
  && Array.isArray(task.expected_outputs) && task.expected_outputs.length > 0;

const executionConfig = roleCatalog.execution ?? {};
const maxRounds = Number(executionConfig.max_rounds ?? 2);
const maxRetriesPerRole = Number(executionConfig.max_retries_per_role ?? 1);
const outputSpecs = roleCatalog.roles
  .map((role) => ({
    role: role.id,
    order: role.order,
    runsWhileApprovalPending: role.runs_while_approval_pending === true,
    file: role.output?.file,
    title: role.output?.title,
    headings: role.output?.headings
  }))
  .sort((left, right) => left.order - right.order);

function assertConfiguration() {
  if (!["mock", "local_llm"].includes(mode)) throw new Error(`実行モードが不正です: ${mode}`);
  if (!Number.isFinite(requestTimeoutMs) || requestTimeoutMs <= 0) {
    throw new Error("LM_STUDIO_TIMEOUT_MSには正の数値を指定してください。");
  }
  if (!Number.isInteger(maxTokens) || maxTokens <= 0) {
    throw new Error("LM_STUDIO_MAX_TOKENSには正の整数を指定してください。");
  }
  if (!Array.isArray(roleCatalog.roles) || roleCatalog.roles.length === 0) {
    throw new Error("role_catalog.jsonには1件以上のrolesを指定してください。");
  }
  if (!Number.isInteger(maxRounds) || maxRounds <= 0) {
    throw new Error("execution.max_roundsには正の整数を指定してください。");
  }
  if (!Number.isInteger(maxRetriesPerRole) || maxRetriesPerRole < 0) {
    throw new Error("execution.max_retries_per_roleには0以上の整数を指定してください。");
  }
  const roleIds = outputSpecs.map((spec) => spec.role);
  const outputFiles = outputSpecs.map((spec) => spec.file);
  if (new Set(roleIds).size !== roleIds.length || new Set(outputFiles).size !== outputFiles.length) {
    throw new Error("ロールIDと成果物ファイル名は重複できません。");
  }
  for (const spec of outputSpecs) {
    if (!spec.role || !Number.isInteger(spec.order) || !spec.file || !spec.title
      || !Array.isArray(spec.headings) || spec.headings.length === 0) {
      throw new Error(`ロールの実行設定が不足しています: ${spec.role ?? "ID未設定"}`);
    }
  }
  if (mode === "local_llm") {
    const hostname = new URL(baseUrl).hostname;
    if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(hostname)) {
      throw new Error(`ローカル以外のAI接続先は使用できません: ${hostname}`);
    }
  }
}

function timestampId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function saveJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function mockSection(spec, heading) {
  const common = {
    "目的": `- ${task.goal}`,
    "対象外": "- 危険操作の実行と外部サービスへの送信",
    "作業順序": "1. 入力を確認する\n2. 役割別成果物を順番に作る\n3. レビュー・品質・安全の確認結果を記録する",
    "不足情報": "- 現時点で進行を止める不足情報はない",
    "構成": "- タスクボードと保存済み成果物を介して各役割が順次連携する",
    "データ": "- 教材用fixture、共有記憶、直前までの役割別成果物だけを扱う",
    "境界": `- 承認待ち: ${approvalRequired.join("、") || "なし"}\n- 禁止: ${forbidden.join("、") || "秘密情報利用とOS設定変更"}`,
    "失敗時の扱い": "- 不足情報、承認待ち、AI接続失敗をtask_board.jsonとrun_log.jsonへ記録して停止する",
    "実行案": "- 計画、設計、レビュー、品質確認、安全確認を順番に作成する",
    "変更対象": `- ${approvalRequired.includes("ファイル変更") ? "人間の承認後に対象ファイルを確定する" : "教材内の実行成果物だけを保存する"}`,
    "実行しない操作": "- 未承認のファイル変更・ファイル削除・コマンド実行・外部送信、秘密情報利用",
    "承認待ち": `- ${approvalRequired.join("、") || "なし"}`,
    "指摘事項": "- 各成果物が前工程の判断根拠を参照しているか確認する",
    "重大度": "- 重大: 承認境界違反または必要成果物の欠落",
    "対応案": "- 欠落をtask_board.jsonへ戻し、最大ラウンド数の範囲で再確認する",
    "残リスク": "- 模擬応答だけでは生成内容のばらつきを評価できない",
    "確認観点": "- 必要成果物、停止理由、承認待ち項目、役割ごとの責任境界",
    "機械的検査": "- task_board、役割別成果物、承認境界を既存checkで検査する",
    "受入条件": "- 必須章が空でなく、危険操作を完了扱いにせず、最終報告まで追跡できる",
    "禁止操作": `- ${forbidden.join("、") || "秘密情報利用、OS設定変更"}`,
    "承認待ち操作": `- ${approvalRequired.join("、") || "なし"}`,
    "秘密情報確認": "- fixtureと成果物にtoken、password、secret、api_keyを含めない",
    "判断": `- ${approvalRequired.length > 0 ? "人間承認まで保留する" : "役割別成果物を作成して完了する"}`,
    "理由": "- 依頼内容と共有記憶の承認境界に基づく",
    "参照成果物": "- plan.md、design_note.md、execution_proposal.md、review_report.md、qa_checklist.md、safety_report.md",
    "次回引き継ぎ": `- ${approvalRequired.length > 0 ? "承認結果をtask_board.jsonへ反映する" : "実行ログと最終報告を確認する"}`,
    "結論": `- ${approvalRequired.length > 0 ? "承認待ちとして停止した" : "役割分担した一連の成果物を保存した"}`,
    "作成物": "- タスクボード、計画、設計、実行案、レビュー、品質確認、安全確認、判断ログ、実行ログ",
    "残課題": `- ${approvalRequired.length > 0 ? "人間による承認判断" : "ローカルLLM実行時の出力比較"}`,
    "次の作業": "- 保存した成果物とrun_log.jsonを読み、役割間の引き継ぎを確認する"
  };
  return common[heading] ?? "- 該当内容を確認する";
}

function mockOutput(spec) {
  return [`# ${spec.title}`, ...spec.headings.flatMap((heading) => [`\n## ${heading}\n`, mockSection(spec, heading)])].join("\n");
}

async function readJson(response, target) {
  const body = await response.text();
  if (!response.ok) throw new Error(`${target}への通信に失敗しました（HTTP ${response.status}）: ${body}`);
  return JSON.parse(body);
}

async function chooseModel() {
  if (process.env.LM_STUDIO_CHAT_MODEL) return process.env.LM_STUDIO_CHAT_MODEL;
  const response = await fetch(`${baseUrl}/v1/models`, { signal: AbortSignal.timeout(requestTimeoutMs) });
  const models = await readJson(response, "LM Studioのモデル一覧");
  const model = models.data?.find((item) => !/embed|embedding|nomic/i.test(item.id));
  if (!model?.id) throw new Error("LM Studioにチャット用モデルが見つかりません。");
  return model.id;
}

async function localLlmOutput(spec, model, taskBoard, previousOutputs) {
  const role = roleCatalog.roles.find((item) => item.id === spec.role);
  if (!role) throw new Error(`ロール定義が見つかりません: ${spec.role}`);
  const readableOutputs = Object.fromEntries(
    Object.entries(previousOutputs).filter(([file]) => role.reads.includes(file))
  );
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(requestTimeoutMs),
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: maxTokens,
      chat_template_kwargs: { enable_thinking: false },
      messages: [
        {
          role: "system",
          content: [
            `あなたは${role.name}です。`,
            `判断可能範囲: ${role.can_decide.join("、")}`,
            `禁止事項: ${role.must_not_do.join("、")}`,
            `Markdownの見出しを次の順で必ず使用してください: ${spec.headings.map((heading) => `## ${heading}`).join("、")}`,
            "危険操作を実行したと書かず、必要なら承認待ちまたは禁止として記録してください。",
            "思考過程は出力せず、各見出しを1～2文で簡潔に記述してください。"
          ].join("\n")
        },
        {
          role: "user",
          content: `/no_think\n${JSON.stringify({ task, task_board: taskBoard, shared_memory: sharedMemory, readable_outputs: readableOutputs }, null, 2)}`
        }
      ]
    })
  });
  const result = await readJson(response, `${role.name}の呼び出し`);
  const choice = result.choices?.[0];
  const content = choice?.message?.content?.trim();
  if (!content) {
    const reason = choice?.finish_reason ? `（終了理由: ${choice.finish_reason}）` : "";
    throw new Error(`${role.name}の出力が空です${reason}。`);
  }
  for (const heading of spec.headings) {
    if (!content.includes(`## ${heading}`)) throw new Error(`${role.name}の出力に見出し「${heading}」がありません。`);
  }
  return content;
}

function runCheck(id, args) {
  const result = spawnSync(process.execPath, args, { cwd: appRoot, encoding: "utf8" });
  return {
    name: id,
    status: result.status === 0 ? "passed" : "failed",
    message: (result.stdout.trim() || result.stderr.trim() || `終了コード: ${result.status}`).split(/\r?\n/).at(-1)
  };
}

async function main() {
  assertConfiguration();
  const startedAt = new Date().toISOString();
  const safeTaskId = String(task.task_id ?? "unknown").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64) || "unknown";
  const initialBlockedReason = !hasContext
    ? "目的または期待成果物が不足しています。"
    : forbidden.length > 0
      ? `禁止操作が含まれています: ${forbidden.join("、")}`
      : null;
  const runId = `run-${safeTaskId}-${timestampId()}`;
  const runDirectory = path.join(appRoot, "runs", runId);
  fs.mkdirSync(runDirectory, { recursive: true });
  saveJson(path.join(runDirectory, "task_request.json"), task);

  const taskBoard = {
    task_id: task.task_id ?? "unknown",
    title: task.title ?? "名称未設定",
    status: initialBlockedReason ? "blocked" : "in_progress",
    current_role: !hasContext
      ? (outputSpecs.find((spec) => spec.role === "planner")?.role ?? outputSpecs[0].role)
      : forbidden.length > 0
        ? (outputSpecs.find((spec) => spec.role === "safety")?.role ?? outputSpecs[0].role)
        : outputSpecs[0].role,
    mode,
    round: 1,
    max_rounds: maxRounds,
    max_retries_per_role: maxRetriesPerRole,
    retry_count: 0,
    role_count: outputSpecs.length,
    required_outputs: outputSpecs.map((spec) => spec.file),
    blocked_reason: initialBlockedReason,
    approval_required: approvalRequired,
    completed_roles: []
  };
  saveJson(path.join(runDirectory, "task_board.json"), taskBoard);

  const roles = [];
  const outputs = {};
  let model = null;
  let failureReason = taskBoard.blocked_reason;

  if (hasContext && forbidden.length === 0) {
    if (mode === "local_llm") {
      try {
        model = await chooseModel();
      } catch (error) {
        failureReason = error instanceof Error ? error.message : String(error);
        taskBoard.status = "blocked";
        taskBoard.blocked_reason = failureReason;
        roles.push({ role: "coordinator", status: "failed", output: null, notes: [failureReason] });
      }
    }
    const activeSpecs = approvalRequired.length > 0
      ? outputSpecs.filter((spec) => spec.runsWhileApprovalPending)
      : outputSpecs;
    for (const spec of failureReason ? [] : activeSpecs) {
      taskBoard.current_role = spec.role;
      taskBoard.status = ["reviewer", "qa", "safety"].includes(spec.role) ? "in_review" : "in_progress";
      saveJson(path.join(runDirectory, "task_board.json"), taskBoard);
      let completed = false;
      let lastError = null;
      for (let attempt = 1; attempt <= maxRetriesPerRole + 1; attempt += 1) {
        try {
          const content = mode === "local_llm"
            ? await localLlmOutput(spec, model, taskBoard, outputs)
            : mockOutput(spec);
          fs.writeFileSync(path.join(runDirectory, spec.file), `${content.trim()}\n`, "utf8");
          outputs[spec.file] = content;
          taskBoard.completed_roles.push(spec.role);
          roles.push({ role: spec.role, status: "completed", output: spec.file, attempts: attempt, notes: [] });
          completed = true;
          break;
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          if (attempt <= maxRetriesPerRole) {
            taskBoard.retry_count += 1;
            saveJson(path.join(runDirectory, "task_board.json"), taskBoard);
          }
        }
      }
      if (!completed) {
        failureReason = lastError;
        taskBoard.status = "blocked";
        taskBoard.blocked_reason = failureReason;
        roles.push({
          role: spec.role,
          status: "failed",
          output: spec.file,
          attempts: maxRetriesPerRole + 1,
          notes: [failureReason]
        });
        break;
      }
    }
    const reviewOutput = outputSpecs.find((spec) => spec.role === "reviewer")?.file;
    if (reviewOutput && outputs[reviewOutput]) {
      const downstreamRoles = roleCatalog.roles
        .filter((role) => role.reads.includes(reviewOutput) && taskBoard.completed_roles.includes(role.id))
        .map((role) => role.id);
      taskBoard.review_reflection = {
        review_output: reviewOutput,
        status: downstreamRoles.length > 0 ? "included_in_downstream_context" : "not_reflected",
        downstream_roles: downstreamRoles
      };
      if (downstreamRoles.length === 0 && !failureReason) {
        failureReason = "レビュー結果が後続ロールへ引き渡されていません。";
        taskBoard.status = "blocked";
        taskBoard.blocked_reason = failureReason;
      }
    }
    if (!failureReason && approvalRequired.length > 0) {
      taskBoard.status = "blocked";
      taskBoard.blocked_reason = `人間承認が必要です: ${approvalRequired.join("、")}`;
    } else if (!failureReason) {
      taskBoard.status = "completed";
      taskBoard.current_role = outputSpecs.at(-1).role;
    }
    saveJson(path.join(runDirectory, "task_board.json"), taskBoard);
  }

  const checks = [
    runCheck("check_task_fixture", [path.join(appRoot, "checks", "check_task_fixture.js"), fixtureFile,
      !hasContext ? "missing_context" : approvalRequired.length > 0 ? "needs_approval" : "success"]),
    runCheck("check_task_board", [path.join(appRoot, "checks", "check_task_board.js"), path.join(runDirectory, "task_board.json")])
  ];
  if (hasContext && approvalRequired.length === 0 && !failureReason) {
    checks.push(runCheck("check_role_outputs", [path.join(appRoot, "checks", "check_role_outputs.js"), runDirectory]));
  }
  if (hasContext && outputs["safety_report.md"] && outputs["execution_proposal.md"]) {
    checks.push(runCheck("check_approval_boundary", [
      path.join(appRoot, "checks", "check_approval_boundary.js"), fixtureFile, runDirectory
    ]));
  }
  if (checks.some((check) => check.status === "failed") && !failureReason) {
    failureReason = checks.filter((check) => check.status === "failed").map((check) => check.message).join(" / ");
    taskBoard.status = "blocked";
    taskBoard.blocked_reason = failureReason;
    saveJson(path.join(runDirectory, "task_board.json"), taskBoard);
  }

  const runLog = {
    run_id: runId,
    task_id: taskBoard.task_id,
    requested_mode: mode,
    effective_mode: mode,
    model,
    role_count: outputSpecs.length,
    max_rounds: maxRounds,
    max_retries_per_role: maxRetriesPerRole,
    retry_count: taskBoard.retry_count,
    review_reflection: taskBoard.review_reflection ?? null,
    started_at: startedAt,
    ended_at: new Date().toISOString(),
    roles,
    checks,
    status: taskBoard.status,
    blocked_reason: taskBoard.blocked_reason,
    approval_required: approvalRequired,
    forbidden_operations: forbidden,
    failure_reason: failureReason
  };
  saveJson(path.join(runDirectory, "run_log.json"), runLog);

  console.log(JSON.stringify({
    ok: taskBoard.status === "completed" && !failureReason && checks.every((check) => check.status === "passed"),
    runId,
    mode,
    model,
    status: taskBoard.status,
    blockedReason: taskBoard.blocked_reason,
    approvalRequired,
    forbiddenOperations: forbidden,
    completedRoles: taskBoard.completed_roles,
    checks,
    runDirectory: path.relative(appRoot, runDirectory),
    savedFiles: fs.readdirSync(runDirectory).sort()
  }, null, 2));

  if (mode === "local_llm" && failureReason) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[system48] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
