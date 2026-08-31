function shown(value) {
  return value?.trim() || '未記入';
}

function lines(value) {
  const items = value?.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) ?? [];
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- 未記入';
}

function tableCell(value) {
  return shown(value).replaceAll('|', '\\|').replace(/\r?\n/g, '<br>');
}

export function workRows(data) {
  return [1, 2, 3, 4].map((number) => ({
    id: `W-${String(number).padStart(2, '0')}`,
    phase: data[`work${number}Phase`]?.trim() ?? '',
    content: data[`work${number}Content`]?.trim() ?? '',
    artifact: data[`work${number}Artifact`]?.trim() ?? '',
    estimate: data[`work${number}Estimate`]?.trim() ?? '',
    basis: data[`work${number}Basis`]?.trim() ?? ''
  })).filter((row) => Object.values(row).slice(1).some(Boolean));
}

export function riskRows(data) {
  return [1, 2].map((number) => ({
    id: `R-${String(number).padStart(2, '0')}`,
    risk: data[`risk${number}Risk`]?.trim() ?? '',
    condition: data[`risk${number}Condition`]?.trim() ?? '',
    impact: data[`risk${number}Impact`]?.trim() ?? '',
    action: data[`risk${number}Action`]?.trim() ?? '',
    estimateImpact: data[`risk${number}EstimateImpact`]?.trim() ?? ''
  })).filter((row) => Object.values(row).slice(1).some(Boolean));
}

export function calculateTotal(data) {
  return workRows(data).reduce((total, row) => total + Number(row.estimate || 0), 0);
}

export function validateEstimate(data) {
  const errors = [];
  const required = [
    ['request', '依頼内容'],
    ['targetScope', '見積り対象'],
    ['excludedScope', '対象外'],
    ['assumptions', '前提'],
    ['reestimateConditions', '再見積り条件']
  ];
  for (const [name, label] of required) {
    if (!data[name]?.trim()) errors.push(`${label}を入力してください。`);
  }

  const works = workRows(data);
  if (works.length === 0) errors.push('作業を1件以上入力してください。');
  for (const row of works) {
    if (!row.phase || !row.content || !row.artifact || !row.estimate || !row.basis) {
      errors.push(`${row.id}の項目をすべて入力してください。`);
    } else if (!Number.isFinite(Number(row.estimate)) || Number(row.estimate) <= 0) {
      errors.push(`${row.id}の見積りは0より大きい数値で入力してください。`);
    }
  }

  const risks = riskRows(data);
  if (risks.length === 0) errors.push('リスクを1件以上入力してください。');
  for (const row of risks) {
    if (!row.risk || !row.condition || !row.impact || !row.action || !row.estimateImpact) {
      errors.push(`${row.id}の項目をすべて入力してください。`);
    }
  }
  return errors;
}

export function buildWorkBreakdown(data) {
  const rows = workRows(data).map((row) =>
    `| ${row.id} | ${tableCell(row.phase)} | ${tableCell(row.content)} | ${tableCell(row.artifact)} | ${tableCell(row.estimate)}人日 | ${tableCell(row.basis)} |`
  ).join('\n');
  return `# 作業分解表

| 作業ID | 工程 | 作業内容 | 成果物 | 見積り | 根拠 |
|---|---|---|---|---|---|
${rows || '| - | 未記入 | 未記入 | 未記入 | 未記入 | 未記入 |'}

合計: ${calculateTotal(data).toFixed(1)}人日
`;
}

export function buildRiskList(data) {
  const rows = riskRows(data).map((row) =>
    `| ${row.id} | ${tableCell(row.risk)} | ${tableCell(row.condition)} | ${tableCell(row.impact)} | ${tableCell(row.action)} | ${tableCell(row.estimateImpact)} |`
  ).join('\n');
  return `# リスク一覧

| ID | リスク | 発生条件 | 影響 | 対策 | 見積り影響 |
|---|---|---|---|---|---|
${rows || '| - | 未記入 | 未記入 | 未記入 | 未記入 | 未記入 |'}
`;
}

export function buildEstimateBasis(data) {
  return `# 見積り根拠表

## 依頼内容

${shown(data.request)}

## 見積り対象

${shown(data.targetScope)}

## 対象外

${lines(data.excludedScope)}

## 前提

${lines(data.assumptions)}

## 見積り

| 単位 | 合計 | 見積り日 |
|---|---|---|
| 人日 | ${calculateTotal(data).toFixed(1)} | ${tableCell(data.estimateDate)} |

## 再見積り条件

${lines(data.reestimateConditions)}

## 補足

${shown(data.notes)}
`;
}

export const outputs = {
  basis: { title: '見積り根拠表', fileName: 'estimate-basis.md', build: buildEstimateBasis },
  work: { title: '作業分解表', fileName: 'work-breakdown.md', build: buildWorkBreakdown },
  risks: { title: 'リスク一覧', fileName: 'risk-list.md', build: buildRiskList }
};
