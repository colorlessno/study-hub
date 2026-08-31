"use strict";

const { CATEGORIES, DECISIONS, REASON_CODES, SAFE_RESPONSES } = require("./policy");

// 入力は「意図の抽象サマリ + 文脈」。不適切内容の本文そのものは扱わない（要件 NFR: 露骨内容の詳細生成をしない）。
// input: { intent: string, context: string }
// output: { category, decision, reasonCode, confidence, safeResponse }

const RULES = [
  {
    // 自傷・自殺の兆候は最優先で escalate（escalation_notes.md）
    category: CATEGORIES.SELF_HARM,
    match: /自傷|自殺|死にたい|crisis|self.?harm/i,
    decide: () => ({ decision: DECISIONS.ESCALATE, reasonCode: REASON_CODES.IMMINENT_RISK, confidence: "high" }),
  },
  {
    category: CATEGORIES.PRIVACY,
    match: /個人情報|認証情報|private.*(record|data)|records?の開示|推測/i,
    decide: () => ({ decision: DECISIONS.REFUSE, reasonCode: REASON_CODES.PROTECTED_DATA_REQUEST, confidence: "high" }),
  },
  {
    category: CATEGORIES.HARASSMENT,
    match: /侮辱|嫌がらせ|攻撃文|差別|harass|insult/i,
    decide: (ctx) =>
      /targeted|特定|人物/i.test(ctx)
        ? { decision: DECISIONS.REFUSE, reasonCode: REASON_CODES.TARGETED_ABUSE, confidence: "high" }
        : { decision: DECISIONS.CAUTION, reasonCode: REASON_CODES.EDUCATIONAL_CONTEXT, confidence: "medium" },
  },
  {
    category: CATEGORIES.SEXUAL,
    match: /性的|露骨|adult|nsfw/i,
    decide: (ctx) => {
      if (/classification|分類/i.test(ctx))
        return { decision: DECISIONS.ALLOW_WITH_BOUNDARY, reasonCode: REASON_CODES.CLASSIFICATION_ONLY, confidence: "medium" };
      if (/医療|教育|education|medical/i.test(ctx))
        return { decision: DECISIONS.CAUTION, reasonCode: REASON_CODES.EDUCATIONAL_CONTEXT, confidence: "medium" };
      return { decision: DECISIONS.REFUSE, reasonCode: REASON_CODES.EXPLICIT_CONTENT_REQUEST, confidence: "high" };
    },
  },
  {
    category: CATEGORIES.VIOLENCE,
    match: /暴力|加害|残虐|violence/i,
    decide: (ctx) =>
      /ニュース|教育|news|education/i.test(ctx)
        ? { decision: DECISIONS.CAUTION, reasonCode: REASON_CODES.EDUCATIONAL_CONTEXT, confidence: "medium" }
        : { decision: DECISIONS.REFUSE, reasonCode: REASON_CODES.HARM_INSTRUCTION, confidence: "high" },
  },
  {
    category: CATEGORIES.ILLEGAL,
    match: /違法|犯罪|illegal/i,
    decide: () => ({ decision: DECISIONS.REFUSE, reasonCode: REASON_CODES.ILLEGAL_SUPPORT, confidence: "high" }),
  },
];

function moderate(input = {}) {
  const safeInput = input && typeof input === "object" ? input : {};
  const intent = String(safeInput.intent || "");
  const context = String(safeInput.context || "");
  for (const rule of RULES) {
    if (rule.match.test(intent)) {
      const r = rule.decide(context);
      return {
        category: rule.category,
        decision: r.decision,
        reasonCode: r.reasonCode,
        confidence: r.confidence,
        safeResponse: SAFE_RESPONSES[r.decision],
      };
    }
  }
  return {
    category: CATEGORIES.SAFE,
    decision: DECISIONS.ALLOW,
    reasonCode: REASON_CODES.NO_RESTRICTED_INTENT,
    confidence: "medium",
    safeResponse: SAFE_RESPONSES[DECISIONS.ALLOW],
  };
}

module.exports = { moderate, RULES };
