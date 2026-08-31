function shown(value) {
  return value?.trim() || '未記入';
}

function tableCell(value) {
  return shown(value).replaceAll('|', '\\|').replace(/\r?\n/g, '<br>');
}

function splitRoles(value) {
  return value?.split(/[、,／/\r\n]+/).map((item) => item.trim()).filter(Boolean) ?? [];
}

export function stakeholderRoles(data) {
  return [...new Set(data.stakeholders?.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) ?? [])];
}

export function workRows(data) {
  return [1, 2, 3, 4].map((number) => ({
    id: `W-${String(number).padStart(2, '0')}`,
    task: data[`work${number}Task`]?.trim() ?? '',
    responsible: data[`work${number}Responsible`]?.trim() ?? '',
    accountable: data[`work${number}Accountable`]?.trim() ?? '',
    consulted: data[`work${number}Consulted`]?.trim() ?? '',
    informed: data[`work${number}Informed`]?.trim() ?? '',
    note: data[`work${number}Note`]?.trim() ?? ''
  })).filter((row) => Object.values(row).slice(1).some(Boolean));
}

export function decisionRows(data) {
  return [1, 2].map((number) => ({
    id: data[`decision${number}Id`]?.trim() || `D-${String(number).padStart(2, '0')}`,
    content: data[`decision${number}Content`]?.trim() ?? '',
    decisionMaker: data[`decision${number}DecisionMaker`]?.trim() ?? '',
    deadline: data[`decision${number}Deadline`]?.trim() ?? '',
    impact: data[`decision${number}Impact`]?.trim() ?? '',
    status: data[`decision${number}Status`] ?? '未決定'
  })).filter((row) => [row.content, row.decisionMaker, row.deadline, row.impact].some(Boolean));
}

export function escalationRows(data) {
  return [1, 2].map((number) => ({
    id: data[`escalation${number}Id`]?.trim() || `E-${String(number).padStart(2, '0')}`,
    issue: data[`escalation${number}Issue`]?.trim() ?? '',
    reason: data[`escalation${number}Reason`]?.trim() ?? '',
    impact: data[`escalation${number}Impact`]?.trim() ?? '',
    requestTo: data[`escalation${number}RequestTo`]?.trim() ?? '',
    deadline: data[`escalation${number}Deadline`]?.trim() ?? '',
    status: data[`escalation${number}Status`] ?? '未依頼'
  })).filter((row) => [row.issue, row.reason, row.impact, row.requestTo, row.deadline].some(Boolean));
}

function roleErrors(value, label, roles, single) {
  const values = splitRoles(value);
  const errors = [];
  if (single && values.length > 1) errors.push(`${label}には役割を1つだけ入力してください。`);
  for (const role of values) {
    if (!roles.includes(role)) errors.push(`${label}の「${role}」を関係者の役割へ追加してください。`);
  }
  return errors;
}

export function validateRaci(data) {
  const errors = [];
  if (!data.projectName?.trim()) errors.push('対象案件を入力してください。');
  if (!data.scope?.trim()) errors.push('整理する範囲を入力してください。');
  const roles = stakeholderRoles(data);
  if (roles.length < 2) errors.push('関係者の役割を2件以上入力してください。');

  const works = workRows(data);
  if (works.length === 0) errors.push('作業を1件以上入力してください。');
  for (const row of works) {
    if (!row.task) errors.push(`${row.id}の作業を入力してください。`);
    if (!row.responsible) errors.push(`${row.id}のResponsibleを入力してください。`);
    if (!row.accountable) errors.push(`${row.id}のAccountableを入力してください。`);
    errors.push(...roleErrors(row.responsible, `${row.id}のResponsible`, roles, true));
    errors.push(...roleErrors(row.accountable, `${row.id}のAccountable`, roles, true));
    errors.push(...roleErrors(row.consulted, `${row.id}のConsulted`, roles, false));
    errors.push(...roleErrors(row.informed, `${row.id}のInformed`, roles, false));
  }

  for (const row of decisionRows(data)) {
    if (!row.content || !row.decisionMaker || !row.deadline || !row.impact) {
      errors.push(`${row.id}の判断待ち事項をすべて入力してください。`);
    }
    errors.push(...roleErrors(row.decisionMaker, `${row.id}の決定者`, roles, true));
  }

  for (const row of escalationRows(data)) {
    if (!row.issue || !row.reason || !row.impact || !row.requestTo || !row.deadline) {
      errors.push(`${row.id}のエスカレーションをすべて入力してください。`);
    }
    errors.push(...roleErrors(row.requestTo, `${row.id}の依頼先`, roles, true));
  }
  return [...new Set(errors)];
}

export function analyzeRaci(data) {
  const works = workRows(data);
  const decisions = decisionRows(data);
  const escalations = escalationRows(data);
  const errors = validateRaci(data);
  return {
    ok: errors.length === 0,
    workCount: works.length,
    decisionCount: decisions.length,
    escalationCount: escalations.length,
    errors
  };
}

export function buildRaciMatrix(data) {
  const rows = workRows(data).map((row) =>
    `| ${row.id} | ${tableCell(row.task)} | ${tableCell(row.responsible)} | ${tableCell(row.accountable)} | ${tableCell(row.consulted)} | ${tableCell(row.informed)} | ${tableCell(row.note)} |`
  ).join('\n');
  const roles = stakeholderRoles(data).map((role) => `- ${role}`).join('\n') || '- 未記入';
  return `# RACI表

対象案件: ${shown(data.projectName)}

整理する範囲: ${shown(data.scope)}

## 関係者の役割

${roles}

| ID | 作業 | Responsible | Accountable | Consulted | Informed | 備考 |
|---|---|---|---|---|---|---|
${rows || '| W-01 | 未記入 | 未記入 | 未記入 | 未記入 | 未記入 | 未記入 |'}
`;
}

export function buildDecisionList(data) {
  const rows = decisionRows(data).map((row) =>
    `| ${tableCell(row.id)} | ${tableCell(row.content)} | ${tableCell(row.decisionMaker)} | ${tableCell(row.deadline)} | ${tableCell(row.impact)} | ${tableCell(row.status)} |`
  ).join('\n');
  return `# 判断待ち事項一覧

対象案件: ${shown(data.projectName)}

| ID | 内容 | 決定者 | 期限 | 未決時の影響 | 状態 |
|---|---|---|---|---|---|
${rows || '| D-01 | 未記入 | 未記入 | 未記入 | 未記入 | 未決定 |'}
`;
}

export function buildEscalationNote(data) {
  const rows = escalationRows(data).map((row) =>
    `| ${tableCell(row.id)} | ${tableCell(row.issue)} | ${tableCell(row.reason)} | ${tableCell(row.impact)} | ${tableCell(row.requestTo)} | ${tableCell(row.deadline)} | ${tableCell(row.status)} |`
  ).join('\n');
  return `# エスカレーションメモ

対象案件: ${shown(data.projectName)}

| ID | 決められない事項 | 理由 | 影響 | 依頼先 | 期限 | 状態 |
|---|---|---|---|---|---|---|
${rows || '| E-01 | 未記入 | 未記入 | 未記入 | 未記入 | 未記入 | 未依頼 |'}
`;
}

export const outputs = {
  raci: { title: 'RACI表', fileName: 'raci-matrix.md', build: buildRaciMatrix },
  decisions: { title: '判断待ち事項一覧', fileName: 'decision-pending-list.md', build: buildDecisionList },
  escalations: { title: 'エスカレーションメモ', fileName: 'escalation-note.md', build: buildEscalationNote }
};
