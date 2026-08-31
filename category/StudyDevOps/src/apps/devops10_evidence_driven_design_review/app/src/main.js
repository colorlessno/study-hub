import { buildMarkdown, reportFileName, validateDecision } from './decision-record.js';

const storageKey = 'studyhub:devops10:release-decision';
const form = document.querySelector('#release-form');
const panels = [...document.querySelectorAll('[data-step-panel]')];
const stepButtons = [...document.querySelectorAll('[data-step-button]')];
const status = document.querySelector('#status');
const preview = document.querySelector('#preview');
const previousButton = document.querySelector('#previous-step');
const nextButton = document.querySelector('#next-step');
const stepPosition = document.querySelector('#step-position');
let currentStep = 1;

const scenario = {
  releaseId: 'release-2026-08-studyhub',
  targetSystem: 'StudyHub',
  revision: '3141690',
  reviewer: '学習者',
  changeSummary: 'テーマ画面の教材表示を改善',
  buildStatus: 'success',
  testStatus: 'success',
  testCount: '103件成功',
  ciStatus: 'not-used',
  apiEvidence: 'カタログAPIが200を返した',
  databaseChange: 'none',
  healthStatus: 'success',
  readinessStatus: '',
  requestId: 'studyhub-release-check-001',
  logEvidence: '起動ログにエラーがないことを確認した',
  monitoringEvidence: '起動失敗を実行ログで確認する',
  rollbackStatus: 'verified',
  rollbackProcedure: '直前の確認済みコミットへ戻し、buildとtestを再実行する',
  unresolvedRisks: '依存サービス停止時のreadinessを未確認',
  decision: 'conditional',
  decisionReason: 'buildとtestは成功したが、readinessの失敗経路が未確認である',
  conditions: 'readinessの失敗経路を確認してから利用範囲を広げる',
  actionOwner: '学習者'
};

function formData() {
  return Object.fromEntries(new FormData(form).entries());
}

function setFormData(data) {
  for (const [name, value] of Object.entries(data)) {
    const field = form.elements.namedItem(name);
    if (field && typeof value === 'string') field.value = value;
  }
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
}

function showMessage(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
}

function save() {
  const data = formData();
  const errors = validateDecision(data);
  if (errors.length > 0) {
    showMessage(errors.join(' '), true);
    return;
  }
  const markdown = buildMarkdown(data);
  localStorage.setItem(storageKey, JSON.stringify(data));
  preview.textContent = markdown;
  showMessage('リリース判定をブラウザ内へ保存しました。');
}

function download() {
  const data = formData();
  const errors = validateDecision(data);
  if (errors.length > 0) {
    showMessage(errors.join(' '), true);
    return;
  }
  const url = URL.createObjectURL(new Blob([buildMarkdown(data)], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = reportFileName(data.releaseId);
  link.click();
  URL.revokeObjectURL(url);
  showMessage('Markdownをダウンロードしました。');
}

function clearSaved() {
  localStorage.removeItem(storageKey);
  form.reset();
  preview.textContent = 'まだ保存されていません。';
  showMessage('');
  showStep(1);
}

function restore() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return;
  try {
    const data = JSON.parse(saved);
    setFormData(data);
    preview.textContent = buildMarkdown(formData());
  } catch {
    localStorage.removeItem(storageKey);
  }
}

stepButtons.forEach((button) => {
  button.addEventListener('click', () => showStep(Number(button.dataset.stepButton)));
});
previousButton.addEventListener('click', () => showStep(currentStep - 1));
nextButton.addEventListener('click', () => showStep(currentStep + 1));
document.querySelector('#load-scenario').addEventListener('click', () => {
  setFormData(scenario);
  showMessage('固定シナリオを読み込みました。未確認のreadinessを含めて判定してください。');
});
document.querySelector('#save-report').addEventListener('click', save);
document.querySelector('#download-report').addEventListener('click', download);
document.querySelector('#clear-report').addEventListener('click', clearSaved);

restore();
showStep(1);
