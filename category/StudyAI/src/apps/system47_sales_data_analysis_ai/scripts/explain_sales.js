const fs = require("fs");
const path = require("path");
const { runAggregation } = require("./sql_analysis.js");

const baseUrl = (process.env.LM_STUDIO_BASE_URL ?? "http://127.0.0.1:5858").replace(/\/+$/, "");
const timeoutMs = Number(process.env.LM_STUDIO_TIMEOUT_MS ?? "240000");
const maxTokens = Number(process.env.LM_STUDIO_MAX_TOKENS ?? "1600");
const reasoningEffort = process.env.LM_STUDIO_REASONING_EFFORT ?? "none";
const outputDirectory = path.resolve(__dirname, "..", "outputs");
const promptFile = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "doc",
  "learning_notes",
  "system47_sales_data_analysis_ai",
  "docs",
  "ai_explanation_prompt.md"
);

function assertLocalEndpoint(endpoint) {
  const hostname = new URL(endpoint).hostname;
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(hostname)) {
    throw new Error(`ローカル以外のAI接続先は使用できません: ${hostname}`);
  }
}

async function readJson(response, target) {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${target}への通信に失敗しました（HTTP ${response.status}）: ${body}`);
  }
  return JSON.parse(body);
}

function assertRequiredSections(explanation) {
  const requiredHeadings = ["傾向", "異常値", "仮説", "次の分析観点", "注意点"];
  const missing = requiredHeadings.filter((heading) =>
    !new RegExp(`^#{1,6}\\s+${heading}\\s*$`, "mu").test(explanation)
  );
  if (missing.length > 0) {
    throw new Error(`LM Studioの説明に必須区分がありません: ${missing.join("、")}`);
  }
}

async function chooseChatModel(signal) {
  if (process.env.LM_STUDIO_CHAT_MODEL) return process.env.LM_STUDIO_CHAT_MODEL;

  const response = await fetch(`${baseUrl}/v1/models`, { signal });
  const models = await readJson(response, "LM Studioのモデル一覧");
  const chatModel = models.data?.find((model) => !/embed|embedding|nomic/i.test(model.id));
  if (!chatModel?.id) {
    throw new Error(
      "LM Studioにチャット用モデルが見つかりません。チャット用モデルを読み込むか、LM_STUDIO_CHAT_MODELを指定してください。"
    );
  }
  return chatModel.id;
}

async function main() {
  assertLocalEndpoint(baseUrl);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("LM_STUDIO_TIMEOUT_MSには正の数値を指定してください。");
  }
  if (!Number.isInteger(maxTokens) || maxTokens <= 0) {
    throw new Error("LM_STUDIO_MAX_TOKENSには正の整数を指定してください。");
  }

  const aggregations = {
    monthly: runAggregation("monthly"),
    product: runAggregation("product"),
    customer: runAggregation("customer")
  };
  const prompt = fs.readFileSync(promptFile, "utf8");
  const signal = AbortSignal.timeout(timeoutMs);
  const model = await chooseChatModel(signal);
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: maxTokens,
      reasoning_effort: reasoningEffort,
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: [
            "次の集計済みデータだけを根拠に、指定された形式で説明してください。",
            JSON.stringify(aggregations, null, 2)
          ].join("\n\n")
        }
      ]
    }),
    signal
  });
  const completion = await readJson(response, "LM StudioのチャットAPI");
  const choice = completion.choices?.[0];
  const explanation = choice?.message?.content?.trim();
  if (!explanation) {
    const finishReason = choice?.finish_reason ?? "不明";
    throw new Error(`LM Studioの応答に説明文が含まれていません。終了理由: ${finishReason}`);
  }
  assertRequiredSections(explanation);

  const record = {
    createdAt: new Date().toISOString(),
    baseUrl,
    model,
    source: ["sql/monthly_sales.sql", "sql/product_sales.sql", "sql/customer_sales.sql"],
    aggregations,
    explanation
  };
  fs.mkdirSync(outputDirectory, { recursive: true });
  const jsonPath = path.join(outputDirectory, "ai_explanation_latest.json");
  const markdownPath = path.join(outputDirectory, "ai_explanation_latest.md");
  fs.writeFileSync(jsonPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    markdownPath,
    `# 売上集計のAI説明\n\n- 作成日時: ${record.createdAt}\n- モデル: ${model}\n- 入力: PostgreSQLで実行した3種類の集計SQL\n\n${explanation}\n`,
    "utf8"
  );

  console.log(JSON.stringify({
    model,
    explanation,
    savedFiles: [
      path.relative(process.cwd(), jsonPath),
      path.relative(process.cwd(), markdownPath)
    ]
  }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[system47] ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { assertRequiredSections };
