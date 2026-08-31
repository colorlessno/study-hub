export const STORAGE_KEY = 'studyhub:devops09:incident-report';

export const initialReport = {
  incidentId: 'INC-TRAINING-001',
  detectedAt: 'T+00:00',
  detectedBy: 'devops08の手動HTTP確認',
  status: '調査中',
  investigator: 'learner',
  decisionMaker: 'learner',
  summary: '',
  impact: '',
  unknownScope: '',
  severity: '',
  severityReason: '',
  healthReady: '',
  containerStatus: '',
  requestEvidence: '',
  recentChange: '',
  facts: '',
  hypothesis: '',
  decision: '',
  temporaryAction: '',
  recoveryCheck: '',
  permanentAction: '',
  prevention: '',
  updatedAt: ''
};

export function normalizeReport(value = {}) {
  return Object.fromEntries(
    Object.entries(initialReport).map(([key, defaultValue]) => [
      key,
      typeof value[key] === 'string' ? value[key] : defaultValue
    ])
  );
}

export function validateReport(report) {
  const errors = [];
  if (!report.incidentId.trim()) errors.push('Incident IDを入力してください。');
  if (!report.severity) errors.push('Severityを選択してください。');
  if (!report.facts.trim()) errors.push('確認できた事実を入力してください。');
  if (!report.decision.trim()) errors.push('判断と根拠を入力してください。');
  return errors;
}

function text(value) {
  return value.trim() || '未記入';
}

export function buildMarkdown(report) {
  return `# 障害対応記録: ${text(report.incidentId)}

## 受付情報

- 受付時刻: ${text(report.detectedAt)}
- 検知経路: ${text(report.detectedBy)}
- 現在の状態: ${text(report.status)}
- 調査担当: ${text(report.investigator)}
- 判断者: ${text(report.decisionMaker)}
- Severity: ${text(report.severity)}
- Severityの根拠: ${text(report.severityReason)}

## 概要と影響

### 一文の概要

${text(report.summary)}

### 確認できた利用者影響

${text(report.impact)}

### 未確認の範囲

${text(report.unknownScope)}

## 変更前に保存した証拠

### health / ready

${text(report.healthReady)}

### containerの状態 / 終了コード

${text(report.containerStatus)}

### request ID / error code / ログの場所

${text(report.requestEvidence)}

### 直近のCI結果 / 変更内容

${text(report.recentChange)}

## 調査と判断

### 確認できた事実

${text(report.facts)}

### 原因の仮説と反証方法

${text(report.hypothesis)}

### 判断と根拠

${text(report.decision)}

## 対応

### 一時対応と結果

${text(report.temporaryAction)}

### 回復確認

${text(report.recoveryCheck)}

### 恒久対応

${text(report.permanentAction)}

### 再発防止

${text(report.prevention)}

保存日時: ${text(report.updatedAt)}
`;
}

export function safeFileName(incidentId) {
  const normalized = incidentId.trim().replace(/[^a-zA-Z0-9_-]+/gu, '-');
  return `${normalized || 'incident-report'}.md`;
}
