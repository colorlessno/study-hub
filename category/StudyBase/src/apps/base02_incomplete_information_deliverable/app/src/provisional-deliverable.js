function shown(value) {
  return value?.trim() || '未記入';
}

function lines(value) {
  const items = shown(value) === '未記入'
    ? []
    : value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- 未記入';
}

function tableCell(value) {
  return shown(value).replaceAll('|', '\\|').replace(/\r?\n/g, '<br>');
}

export function validateDeliverable(data) {
  const required = [
    ['request', '依頼内容'],
    ['informationSource', '情報源'],
    ['purpose', '目的'],
    ['writableScope', '書ける範囲'],
    ['unwritableScope', '書けない範囲'],
    ['provisionalContent', '暫定内容'],
    ['assumption', '仮定'],
    ['assumptionBasis', '仮定の根拠'],
    ['assumptionImpact', '仮定が外れた場合の影響'],
    ['unknownMatter', '不明点'],
    ['confirmationContent', '確認する内容'],
    ['unknownTarget', '未確定事項の確認先'],
    ['allowedUse', '利用してよい範囲'],
    ['prohibitedUse', '利用してはいけない範囲'],
    ['limitation', '成果物の限界']
  ];
  return required
    .filter(([name]) => !data[name]?.trim())
    .map(([, label]) => `${label}を入力してください。`);
}

export function buildProvisionalDeliverable(data) {
  return `# 暫定成果物

## 依頼内容

${shown(data.request)}

## 目的

${shown(data.purpose)}

## 対象範囲

${shown(data.targetScope)}

## 情報源

| 情報源 | 確認日 |
|---|---|
| ${tableCell(data.informationSource)} | ${tableCell(data.sourceDate)} |

## 入手済み情報

${lines(data.receivedInformation)}

## 不足情報

${lines(data.missingInformation)}

## 書ける範囲

${lines(data.writableScope)}

## 書けない範囲

${lines(data.unwritableScope)}

## 暫定内容

${shown(data.provisionalContent)}

## 確認待ち

${lines(data.pendingConfirmation)}
`;
}

export function buildAssumptionList(data) {
  return `# 前提・仮定一覧

| ID | 仮定 | 根拠 | 影響 | 確認先 | 状態 |
|---|---|---|---|---|---|
| A-01 | ${tableCell(data.assumption)} | ${tableCell(data.assumptionBasis)} | ${tableCell(data.assumptionImpact)} | ${tableCell(data.assumptionTarget)} | ${tableCell(data.assumptionStatus)} |
`;
}

export function buildUnknownIssueList(data) {
  return `# 未確定事項一覧

| ID | 不明点 | 確認内容 | 確認先 | 期限 | 未解決時の影響 |
|---|---|---|---|---|---|
| U-01 | ${tableCell(data.unknownMatter)} | ${tableCell(data.confirmationContent)} | ${tableCell(data.unknownTarget)} | ${tableCell(data.confirmationDue)} | ${tableCell(data.unresolvedImpact)} |
`;
}

export function buildLimitationNote(data) {
  return `# 成果物限界メモ

## 成果物の限界

${shown(data.limitation)}

## この成果物で利用してよい範囲

${lines(data.allowedUse)}

## この成果物で利用してはいけない範囲

${lines(data.prohibitedUse)}

## 未確定事項

${lines(data.pendingConfirmation)}

## レビュー観点

${lines(data.reviewPoints)}
`;
}

export const outputs = {
  deliverable: {
    title: '暫定成果物',
    fileName: 'provisional-deliverable.md',
    build: buildProvisionalDeliverable
  },
  assumptions: {
    title: '前提・仮定一覧',
    fileName: 'assumption-list.md',
    build: buildAssumptionList
  },
  unknowns: {
    title: '未確定事項一覧',
    fileName: 'unknown-issues-list.md',
    build: buildUnknownIssueList
  },
  limitations: {
    title: '成果物限界メモ',
    fileName: 'deliverable-limitation-note.md',
    build: buildLimitationNote
  }
};
