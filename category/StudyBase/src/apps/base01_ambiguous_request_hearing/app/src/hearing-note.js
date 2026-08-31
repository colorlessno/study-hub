function lines(value) {
  const items = value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- 未記入';
}

function shown(value) {
  return value.trim() || '未記入';
}

function tableCell(value) {
  return shown(value).replaceAll('|', '\\|').replace(/\r?\n/g, '<br>');
}

export function validateMemo(data) {
  const required = [
    ['originalRequest', '依頼原文'],
    ['purpose', '目的'],
    ['currentSituation', '現状'],
    ['successCriteria', '成功条件'],
    ['unknownMatter', '未確定事項'],
    ['confirmationTarget', '確認先'],
    ['nextAction', '次の対応'],
    ['summary', '要約']
  ];
  return required
    .filter(([name]) => !data[name]?.trim())
    .map(([, label]) => `${label}を入力してください。`);
}

export function buildHearingMarkdown(data) {
  return `# ヒアリングメモ

## 依頼原文

${shown(data.originalRequest)}

## 既知情報

${lines(data.knownInformation)}

## 背景

${shown(data.background)}

## 目的

${shown(data.purpose)}

## 現状

${lines(data.currentSituation)}

## 課題

${lines(data.issues)}

## 制約

| 種別 | 内容 |
|---|---|
| 期限 | ${tableCell(data.deadline)} |
| 予算 | ${tableCell(data.budget)} |
| 体制 | ${tableCell(data.organization)} |
| 環境 | ${tableCell(data.environment)} |

## 関係者

${lines(data.stakeholders)}

## 成功条件

${lines(data.successCriteria)}

## 確定情報

${lines(data.confirmedInformation)}

## 仮定

| 仮定 | 根拠 | 外れた場合の影響 |
|---|---|---|
| ${tableCell(data.assumption)} | ${tableCell(data.assumptionBasis)} | ${tableCell(data.assumptionImpact)} |

## 未確定事項

| ID | 確認事項 | 確認先 | 期限 | 状態 |
|---|---|---|---|---|
| U-01 | ${tableCell(data.unknownMatter)} | ${tableCell(data.confirmationTarget)} | ${tableCell(data.confirmationDue)} | 未確認 |

## 次の対応

${shown(data.nextAction)}
`;
}

export function buildRequirementSummaryMarkdown(data) {
  return `# 要件定義入力メモ

## 要約

${shown(data.summary)}

## 確定情報

${lines(data.confirmedInformation)}

## 仮定

| ID | 仮定 | 根拠 | 影響 |
|---|---|---|---|
| A-01 | ${tableCell(data.assumption)} | ${tableCell(data.assumptionBasis)} | ${tableCell(data.assumptionImpact)} |

## 未確定事項

| ID | 未確定事項 | 確認先 | 期限 |
|---|---|---|---|
| U-01 | ${tableCell(data.unknownMatter)} | ${tableCell(data.confirmationTarget)} | ${tableCell(data.confirmationDue)} |

## 推奨する次工程

${shown(data.recommendedNextStep)}
`;
}

export function memoFileName(kind) {
  return kind === 'summary' ? 'requirement-input-summary.md' : 'request-hearing-note.md';
}
