export const statuses = ['確認済み', '不足', '保留', '未確認'];

export const environmentDefinitions = ['URL', 'DB', '外部連携', 'アカウント', 'ログ確認先']
  .map((label, index) => ({
    id: `E-${String(index + 1).padStart(2, '0')}`,
    label,
    number: index + 1
  }));

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

export function environmentRows(data) {
  return environmentDefinitions.map(({ id, label, number }) => ({
    id,
    label,
    content: data[`environment${number}Content`]?.trim() ?? '',
    status: data[`environment${number}Status`] ?? '未確認'
  }));
}

export function dataRows(data) {
  return [1, 2].map((number) => ({
    id: data[`data${number}Id`]?.trim() || `D-${String(number).padStart(2, '0')}`,
    creation: data[`data${number}Creation`]?.trim() ?? '',
    initial: data[`data${number}Initial`]?.trim() ?? '',
    expected: data[`data${number}Expected`]?.trim() ?? '',
    cleanup: data[`data${number}Cleanup`]?.trim() ?? '',
    status: data[`data${number}Status`] ?? '未確認'
  })).filter((row) => [row.creation, row.initial, row.expected, row.cleanup].some(Boolean));
}

export function aggregateStatus(items) {
  const values = items.map((item) => item.status);
  if (values.includes('不足')) return '不足';
  if (values.includes('保留')) return '保留';
  if (values.includes('未確認')) return '未確認';
  return values.length > 0 ? '確認済み' : '未確認';
}

export function decision(data) {
  const checks = [
    data.targetStatus ?? '未確認',
    ...environmentRows(data).map((item) => item.status),
    data.accountStatus ?? '未確認',
    ...dataRows(data).map((item) => item.status),
    data.criteriaStatus ?? '未確認'
  ];
  if (checks.includes('不足')) {
    return { label: '開始不可', reason: '不足している成立条件があります。' };
  }
  if (checks.includes('保留') || checks.includes('未確認') || checks.length === 0) {
    return { label: '保留', reason: '保留または未確認の成立条件があります。' };
  }
  return { label: '開始可能', reason: '記録した成立条件はすべて確認済みです。' };
}

export function validatePreconditions(data) {
  const errors = [];
  const required = [
    ['testName', 'テスト名'],
    ['target', 'テスト対象'],
    ['account', 'アカウント'],
    ['permission', '必要な権限'],
    ['expectedResult', '期待結果'],
    ['acceptanceCriteria', '合否基準'],
    ['stopConditions', '中止条件'],
    ['evidenceLocation', '証拠の保存先'],
    ['judge', '判定者']
  ];
  for (const [name, label] of required) {
    if (!data[name]?.trim()) errors.push(`${label}を入力してください。`);
  }
  for (const row of environmentRows(data)) {
    if (!row.content) errors.push(`${row.label}の内容を入力してください。`);
  }
  const dataItems = dataRows(data);
  if (dataItems.length === 0) errors.push('テストデータを1件以上入力してください。');
  for (const row of dataItems) {
    if (!row.creation || !row.initial || !row.expected || !row.cleanup) {
      errors.push(`${row.id}の項目をすべて入力してください。`);
    }
  }
  return errors;
}

export function buildChecklist(data) {
  const environmentStatus = aggregateStatus(environmentRows(data));
  const testDataStatus = aggregateStatus(dataRows(data));
  const result = decision(data);
  return `# テスト成立条件チェックリスト

テスト名: ${shown(data.testName)}

| ID | 確認項目 | 必要条件 | 状態 | 備考 |
|---|---|---|---|---|
| C-01 | テスト対象 | ${tableCell(data.target)} | ${tableCell(data.targetStatus)} | 対象範囲を確認 |
| C-02 | テスト環境 | 環境確認表を参照 | ${environmentStatus} | URL・DB・外部連携・ログを確認 |
| C-03 | アカウント・権限 | ${tableCell(data.account)} / ${tableCell(data.permission)} | ${tableCell(data.accountStatus)} | 利用者と権限を確認 |
| C-04 | テストデータ | データ確認表を参照 | ${testDataStatus} | 初期状態と期待状態を確認 |
| C-05 | 判定基準 | ${tableCell(data.acceptanceCriteria)} | ${tableCell(data.criteriaStatus)} | 判定者: ${tableCell(data.judge)} |

## 開始可否

${result.label}: ${result.reason}

## 期待結果

${shown(data.expectedResult)}

## 中止条件

${lines(data.stopConditions)}

## 証拠の保存先

${shown(data.evidenceLocation)}

## 代替確認

${shown(data.fallback)}
`;
}

export function buildEnvironmentCheck(data) {
  const rows = environmentRows(data).map((row) =>
    `| ${row.id} | ${row.label} | ${tableCell(row.content)} | ${tableCell(row.status)} |`
  ).join('\n');
  return `# テスト環境確認表

| ID | 項目 | 内容 | 状態 |
|---|---|---|---|
${rows}
`;
}

export function buildDataCheck(data) {
  const rows = dataRows(data).map((row) =>
    `| ${tableCell(row.id)} | ${tableCell(row.creation)} | ${tableCell(row.initial)} | ${tableCell(row.expected)} | ${tableCell(row.cleanup)} | ${tableCell(row.status)} |`
  ).join('\n');
  return `# テストデータ確認表

| データID | 作成方法 | 初期状態 | 期待状態 | 後片付け | 状態 |
|---|---|---|---|---|---|
${rows || '| 未記入 | 未記入 | 未記入 | 未記入 | 未記入 | 未確認 |'}
`;
}

export const outputs = {
  checklist: { title: '成立条件チェックリスト', fileName: 'test-precondition-checklist.md', build: buildChecklist },
  environment: { title: '環境確認表', fileName: 'test-environment-check.md', build: buildEnvironmentCheck },
  data: { title: 'データ確認表', fileName: 'test-data-check.md', build: buildDataCheck }
};
