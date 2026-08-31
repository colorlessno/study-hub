import {
  buildHearingMarkdown,
  buildRequirementSummaryMarkdown,
  memoFileName,
  validateMemo
} from './hearing-note.js';

const storageKey = 'studyhub:base01:hearing-note';
const form = document.querySelector('#hearing-form');
const panels = [...document.querySelectorAll('[data-step-panel]')];
const stepButtons = [...document.querySelectorAll('[data-step-button]')];
const previousButton = document.querySelector('#previous-step');
const nextButton = document.querySelector('#next-step');
const stepPosition = document.querySelector('#step-position');
const status = document.querySelector('#status');
const preview = document.querySelector('#preview');
const previewTitle = document.querySelector('#preview-title');
let currentStep = 1;
let previewKind = 'hearing';

const scenario = {
  originalRequest: '営業案件の取りこぼしをなくしたい。何か改善してほしい。',
  knownInformation: '案件情報はExcelとメールで管理されている\n顧客からの問い合わせは営業担当者ごとに受けている\n案件の対応状況を一元的に見る場所がない\nシステム化するか運用ルールを変えるかは未決定',
  background: '担当者ごとの管理により、問い合わせや商談の対応状況を全体で追跡できていない。',
  purpose: '問い合わせや商談の対応漏れを減らし、対応状況を追跡できるようにする。',
  currentSituation: '案件情報はExcelとメールに分散している\n担当者ごとの管理で全体状況が見えにくい\n対応期限や未対応案件の確認ルールが不明',
  issues: '「取りこぼし」の定義がない\n現在の取りこぼし件数が不明\nシステム化と運用改善のどちらを優先するか未判断',
  deadline: '次回定例までに現状を整理する',
  budget: '未確定',
  organization: '営業担当、営業管理者、情報システム担当',
  environment: '既存のExcelとメールによる運用',
  stakeholders: '依頼者: 改善の目的と予算を確認\n営業管理者: 取りこぼしの定義を確認\n営業担当: 現在の管理方法を確認',
  successCriteria: '未対応案件を週次で一覧化できる\n対応期限を過ぎた案件を把握できる\n取りこぼしの定義と計測方法が合意されている',
  confirmedInformation: '案件情報はExcelとメールに分散している\n案件の対応状況を一元的に見る場所がない',
  assumption: '対応漏れの主因は情報の分散である',
  assumptionBasis: '全体状況を見る場所がないという既知情報',
  assumptionImpact: '原因が別にある場合は、管理方法を変えても対応漏れが減らない',
  unknownMatter: 'どの状態を「取りこぼし」と定義するか',
  confirmationTarget: '営業管理者',
  confirmationDue: '次回定例',
  nextAction: '営業管理者へ、取りこぼしの定義、現状件数、既存管理表の確認を依頼する。',
  summary: '営業案件の対応漏れを減らすため、現在の管理方法と取りこぼしの定義を確認し、対応状況を追跡する条件を整理する。',
  recommendedNextStep: '営業管理者と営業担当への追加ヒアリング後に要件定義へ進む。'
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

function markdown(kind, data = formData()) {
  return kind === 'summary'
    ? buildRequirementSummaryMarkdown(data)
    : buildHearingMarkdown(data);
}

function updatePreview() {
  preview.textContent = markdown(previewKind);
  previewTitle.textContent = previewKind === 'summary'
    ? '要件定義入力メモのプレビュー'
    : 'ヒアリングメモのプレビュー';
  document.querySelector('#show-hearing').classList.toggle('selected', previewKind === 'hearing');
  document.querySelector('#show-summary').classList.toggle('selected', previewKind === 'summary');
}

function save() {
  const data = formData();
  const errors = validateMemo(data);
  if (errors.length > 0) {
    showMessage(errors.join(' '), true);
    return;
  }
  localStorage.setItem(storageKey, JSON.stringify(data));
  updatePreview();
  showMessage('ヒアリング内容をブラウザ内へ保存しました。');
}

function download(kind) {
  const data = formData();
  const errors = validateMemo(data);
  if (errors.length > 0) {
    showMessage(errors.join(' '), true);
    return;
  }
  const url = URL.createObjectURL(new Blob([markdown(kind, data)], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = memoFileName(kind);
  link.click();
  URL.revokeObjectURL(url);
  showMessage(`${kind === 'summary' ? '要件定義入力メモ' : 'ヒアリングメモ'}をダウンロードしました。`);
}

function clearSaved() {
  localStorage.removeItem(storageKey);
  form.reset();
  previewKind = 'hearing';
  preview.textContent = 'まだ保存されていません。';
  previewTitle.textContent = 'ヒアリングメモのプレビュー';
  showMessage('');
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
previousButton.addEventListener('click', () => showStep(currentStep - 1));
nextButton.addEventListener('click', () => showStep(currentStep + 1));
document.querySelector('#load-scenario').addEventListener('click', () => {
  setFormData(scenario);
  showMessage('固定シナリオを読み込みました。各項目の分類と根拠を確認してください。');
});
document.querySelector('#save-note').addEventListener('click', save);
document.querySelector('#download-hearing').addEventListener('click', () => download('hearing'));
document.querySelector('#download-summary').addEventListener('click', () => download('summary'));
document.querySelector('#clear-note').addEventListener('click', clearSaved);
document.querySelector('#show-hearing').addEventListener('click', () => {
  previewKind = 'hearing';
  updatePreview();
});
document.querySelector('#show-summary').addEventListener('click', () => {
  previewKind = 'summary';
  updatePreview();
});

restore();
showStep(1);
