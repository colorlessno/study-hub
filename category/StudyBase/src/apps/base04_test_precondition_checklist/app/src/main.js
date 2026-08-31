import {
  decision,
  environmentDefinitions,
  environmentRows,
  outputs,
  statuses,
  validatePreconditions
} from './preconditions.js';

const storageKey = 'studyhub:base04:test-preconditions';
const form = document.querySelector('#precondition-form');
const panels = [...document.querySelectorAll('[data-step-panel]')];
const stepButtons = [...document.querySelectorAll('[data-step-button]')];
const previewButtons = [...document.querySelectorAll('[data-preview-kind]')];
const previousButton = document.querySelector('#previous-step');
const nextButton = document.querySelector('#next-step');
const stepPosition = document.querySelector('#step-position');
const status = document.querySelector('#status');
const preview = document.querySelector('#preview');
const previewTitle = document.querySelector('#preview-title');
const decisionLabel = document.querySelector('#decision');
const decisionReason = document.querySelector('#decision-reason');
const statusSummary = document.querySelector('#status-summary');
let currentStep = 1;
let previewKind = 'checklist';

const scenario = {
  testName: '受注照会画面 結合テスト',
  target: 'ログイン後の受注照会画面で検索条件と検索結果を確認する。',
  targetStatus: '確認済み',
  environment1Content: 'https://test.example.invalid/orders',
  environment1Status: '確認済み',
  environment2Content: '検証DBへ接続済み',
  environment2Status: '確認済み',
  environment3Content: '外部連携は使用しない',
  environment3Status: '確認済み',
  environment4Content: '一般ユーザーの発行待ち',
  environment4Status: '不足',
  environment5Content: '検証サーバーのアプリケーションログ',
  environment5Status: '確認済み',
  account: 'テスト専用の一般ユーザー',
  permission: '受注照会の閲覧権限',
  accountStatus: '不足',
  data1Id: 'D-01',
  data1Creation: '受注登録APIで3件作成',
  data1Initial: '検索対象期間内の受注済みデータ',
  data1Expected: '検索結果へ3件表示される',
  data1Cleanup: 'テスト用受注を削除する',
  data1Status: '不足',
  data2Id: 'D-02',
  data2Creation: '対象外期間の受注を1件作成',
  data2Initial: '検索対象期間外の受注済みデータ',
  data2Expected: '検索結果へ表示されない',
  data2Cleanup: 'テスト用受注を削除する',
  data2Status: '保留',
  expectedResult: '指定した期間内の受注3件だけが、決められた列と値で表示される。',
  acceptanceCriteria: '件数が3件であり、受注番号、受注日、顧客名、金額が準備したデータと一致する。',
  criteriaStatus: '保留',
  stopConditions: '一般ユーザーでログインできない\n検証DBへ接続できない\n期待結果を業務担当へ確認できない',
  evidenceLocation: 'test-results/base04/orders-search/',
  judge: 'テスト担当者と業務担当者',
  fallback: 'アカウント発行前は、API単体で検索条件と応答内容だけを確認する。'
};

function statusOptions() {
  return statuses.map((value) =>
    `<option value="${value}"${value === '未確認' ? ' selected' : ''}>${value}</option>`
  ).join('');
}

function environmentItem(label, number) {
  return `<fieldset>
    <legend>E-${String(number).padStart(2, '0')} ${label}</legend>
    <div class="field-grid">
      <label>内容<input name="environment${number}Content"></label>
      <label>状態<select name="environment${number}Status" data-decision-status>${statusOptions()}</select></label>
    </div>
  </fieldset>`;
}

function dataItem(number) {
  return `<fieldset>
    <legend>テストデータ ${number}</legend>
    <div class="field-grid">
      <label>データID<input name="data${number}Id" value="D-${String(number).padStart(2, '0')}"></label>
      <label>状態<select name="data${number}Status" data-decision-status>${statusOptions()}</select></label>
    </div>
    <div class="field-grid">
      <label>作成方法<textarea name="data${number}Creation" rows="2"></textarea></label>
      <label>初期状態<textarea name="data${number}Initial" rows="2"></textarea></label>
      <label>期待状態<textarea name="data${number}Expected" rows="2"></textarea></label>
      <label>後片付け<textarea name="data${number}Cleanup" rows="2"></textarea></label>
    </div>
  </fieldset>`;
}

document.querySelector('#environment-items').innerHTML =
  environmentDefinitions
    .map(({ label, number }) => environmentItem(label, number))
    .join('');
document.querySelector('#data-items').innerHTML = [1, 2].map(dataItem).join('');
document.querySelectorAll('select[data-decision-status]').forEach((select) => {
  if (!select.options.length) select.innerHTML = statusOptions();
});

function formData() {
  return Object.fromEntries(new FormData(form).entries());
}

function setFormData(data) {
  for (const [name, value] of Object.entries(data)) {
    const field = form.elements.namedItem(name);
    if (field && typeof value === 'string') field.value = value;
  }
  updateDecision();
}

function showStep(step) {
  currentStep = Math.min(Math.max(step, 1), panels.length);
  panels.forEach((panel) => { panel.hidden = Number(panel.dataset.stepPanel) !== currentStep; });
  stepButtons.forEach((button) => {
    const selected = Number(button.dataset.stepButton) === currentStep;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-current', selected ? 'step' : 'false');
  });
  previousButton.disabled = currentStep === 1;
  nextButton.disabled = currentStep === panels.length;
  stepPosition.textContent = `${currentStep} / ${panels.length}`;
  window.scrollTo(0, 0);
}

function showMessage(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
}

function updateDecision() {
  const data = formData();
  const result = decision(data);
  decisionLabel.textContent = result.label;
  decisionLabel.dataset.result = result.label;
  decisionReason.textContent = result.reason;
  const counts = Object.fromEntries(statuses.map((value) => [value, 0]));
  const values = [
    data.targetStatus,
    ...environmentRows(data).map((item) => item.status),
    data.accountStatus,
    data.data1Status,
    data.data2Status,
    data.criteriaStatus
  ];
  values.forEach((value) => { if (value in counts) counts[value] += 1; });
  statusSummary.textContent = statuses.map((value) => `${value} ${counts[value]}件`).join(' / ');
}

function updatePreview() {
  const output = outputs[previewKind];
  preview.textContent = output.build(formData());
  previewTitle.textContent = `${output.title}のプレビュー`;
  previewButtons.forEach((button) => {
    button.classList.toggle('selected', button.dataset.previewKind === previewKind);
  });
  updateDecision();
}

function save() {
  const data = formData();
  const errors = validatePreconditions(data);
  if (errors.length > 0) {
    showMessage(errors.join(' '), true);
    return;
  }
  localStorage.setItem(storageKey, JSON.stringify(data));
  updatePreview();
  showMessage('テスト成立条件をブラウザ内へ保存しました。');
}

function downloadCurrent() {
  const data = formData();
  const errors = validatePreconditions(data);
  if (errors.length > 0) {
    showMessage(errors.join(' '), true);
    return;
  }
  const output = outputs[previewKind];
  const url = URL.createObjectURL(new Blob([output.build(data)], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = output.fileName;
  link.click();
  URL.revokeObjectURL(url);
  showMessage(`${output.title}をダウンロードしました。`);
}

function clearSaved() {
  localStorage.removeItem(storageKey);
  form.reset();
  previewKind = 'checklist';
  preview.textContent = 'まだ保存されていません。';
  previewTitle.textContent = '成立条件チェックリストのプレビュー';
  showMessage('');
  updateDecision();
  showStep(1);
}

function restore() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return;
  try {
    setFormData(JSON.parse(saved));
    updatePreview();
  } catch {
    localStorage.removeItem(storageKey);
  }
}

stepButtons.forEach((button) => {
  button.addEventListener('click', () => showStep(Number(button.dataset.stepButton)));
});
previewButtons.forEach((button) => {
  button.addEventListener('click', () => {
    previewKind = button.dataset.previewKind;
    updatePreview();
  });
});
previousButton.addEventListener('click', () => showStep(currentStep - 1));
nextButton.addEventListener('click', () => showStep(currentStep + 1));
form.addEventListener('input', updateDecision);
form.addEventListener('change', updateDecision);
document.querySelector('#load-scenario').addEventListener('click', () => {
  setFormData(scenario);
  showMessage('固定シナリオを読み込みました。不足と保留の理由を確認してください。');
});
document.querySelector('#save-check').addEventListener('click', save);
document.querySelector('#download-current').addEventListener('click', downloadCurrent);
document.querySelector('#clear-check').addEventListener('click', clearSaved);

restore();
updateDecision();
showStep(1);
