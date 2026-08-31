const resultLabels = {
  success: '成功',
  failure: '失敗',
  'not-used': '対象外',
  none: '変更なし・対象なし',
  verified: '確認済み',
  unverified: '未確認',
  go: 'リリース可',
  conditional: '条件付き可',
  'no-go': 'リリース不可'
};

function shown(value) {
  return resultLabels[value] ?? value ?? '';
}

export function validateDecision(data) {
  const errors = [];
  if (!data.releaseId.trim()) errors.push('リリースIDを入力してください。');
  if (!data.targetSystem.trim()) errors.push('対象システムを入力してください。');
  if (!data.buildStatus) errors.push('build結果を選択してください。');
  if (!data.testStatus) errors.push('test結果を選択してください。');
  if (!data.healthStatus) errors.push('health結果を選択してください。');
  if (!data.readinessStatus) errors.push('readiness結果を選択してください。');
  if (!data.rollbackStatus) errors.push('ロールバック確認を選択してください。');
  if (!data.decision) errors.push('リリース判定を選択してください。');
  if (!data.decisionReason.trim()) errors.push('判断の根拠を入力してください。');
  if (data.decision === 'conditional' && !data.conditions.trim()) {
    errors.push('条件付き可の条件を入力してください。');
  }
  return errors;
}

export function buildMarkdown(data) {
  return `# リリース判定記録: ${data.releaseId}

## 対象

| 項目 | 内容 |
|---|---|
| 対象システム | ${data.targetSystem} |
| 対象リビジョン | ${data.revision} |
| 確認日時 | ${data.reviewedAt} |
| 確認者 | ${data.reviewer} |
| 変更概要 | ${data.changeSummary} |

## 自動確認

| 確認 | 結果・証拠 |
|---|---|
| build | ${shown(data.buildStatus)} |
| test | ${shown(data.testStatus)} ${data.testCount} |
| CI | ${shown(data.ciStatus)} |
| API | ${data.apiEvidence} |
| DB変更 | ${shown(data.databaseChange)} |

## 運用確認

| 確認 | 結果・証拠 |
|---|---|
| health | ${shown(data.healthStatus)} |
| readiness | ${shown(data.readinessStatus)} |
| request ID | ${data.requestId} |
| ログ | ${data.logEvidence} |
| 監視と通知 | ${data.monitoringEvidence} |
| ロールバック確認 | ${shown(data.rollbackStatus)} |
| ロールバック手順 | ${data.rollbackProcedure} |
| 未解決のリスク | ${data.unresolvedRisks} |

## 判定

| 項目 | 内容 |
|---|---|
| 判定 | ${shown(data.decision)} |
| 判断の根拠 | ${data.decisionReason} |
| 条件・追加確認 | ${data.conditions} |
| 対応担当 | ${data.actionOwner} |
| 確認期限 | ${data.dueDate} |
`;
}

export function reportFileName(releaseId) {
  const safeId = releaseId.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return `${safeId || 'release'}-decision.md`;
}
