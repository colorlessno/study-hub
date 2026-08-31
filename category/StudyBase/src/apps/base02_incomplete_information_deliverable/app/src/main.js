import { outputs, validateDeliverable } from './provisional-deliverable.js';

const storageKey = 'studyhub:base02:provisional-deliverable';
const form = document.querySelector('#deliverable-form');
const panels = [...document.querySelectorAll('[data-step-panel]')];
const stepButtons = [...document.querySelectorAll('[data-step-button]')];
const previewButtons = [...document.querySelectorAll('[data-preview-kind]')];
const previousButton = document.querySelector('#previous-step');
const nextButton = document.querySelector('#next-step');
const stepPosition = document.querySelector('#step-position');
const status = document.querySelector('#status');
const preview = document.querySelector('#preview');
const previewTitle = document.querySelector('#preview-title');
let currentStep = 1;
let previewKind = 'deliverable';

const scenario = {
  request: '既存の受注照会画面について、仕様書を作成してほしい。',
  receivedInformation: '画面キャプチャが1枚ある\n画面名は「受注照会」である\n検索条件に顧客名、受注日、ステータスがある',
  missingInformation: 'DB定義書\n画面の利用部署\n検索条件の完全な仕様\n権限による表示制御\nステータスの意味\n検索結果の並び順\nCSV出力の有無',
  informationSource: '受注照会画面のキャプチャ1枚',
  sourceDate: '2026-08-24',
  purpose: '現時点で確認できる範囲を整理し、追加確認に使う暫定資料を作る。',
  targetScope: '受注照会画面の表示項目と検索条件',
  writableScope: '画面名\n画面に見えている検索条件\n画面キャプチャから読み取れる一覧項目',
  unwritableScope: 'DB項目との対応\n権限別の表示制御\nステータス値の業務上の意味\nCSV出力や帳票連携の有無',
  provisionalContent: '受注照会画面には、顧客名、受注日、ステータスの検索条件が表示されている。検索方法や権限制御は未確認のため記載しない。',
  assumption: '顧客名は部分一致で検索する。',
  assumptionBasis: '一般的な検索画面の操作を参考にした暫定判断であり、仕様上の根拠はない。',
  assumptionImpact: '完全一致検索の場合は、検索条件の説明とテスト観点を修正する必要がある。',
  assumptionTarget: '業務担当者',
  assumptionStatus: '未確認',
  unknownMatter: 'ステータス値の一覧と業務上の意味',
  confirmationContent: '選択できる値、表示名、各値を使う条件を確認する。',
  unknownTarget: '業務担当者',
  confirmationDue: '次回確認',
  unresolvedImpact: '検索条件とテスト観点を確定できない。',
  allowedUse: '追加ヒアリングの論点整理\n画面項目の一次確認',
  prohibitedUse: '正式な画面仕様書としての承認\n実装や見積もりの確定根拠',
  limitation: '画面キャプチャから読み取れる範囲だけを整理した暫定資料であり、正式な仕様書ではない。',
  reviewPoints: '事実と仮定が混ざっていないか\n書けない範囲が明記されているか\n未確定事項に確認先があるか',
  pendingConfirmation: 'U-01 ステータス値の一覧と意味 / 業務担当者 / 次回確認'
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
  window.scrollTo(0, 0);
}

function showMessage(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
}

function updatePreview() {
  const output = outputs[previewKind];
  preview.textContent = output.build(formData());
  previewTitle.textContent = `${output.title}のプレビュー`;
  previewButtons.forEach((button) => {
    button.classList.toggle('selected', button.dataset.previewKind === previewKind);
  });
}

function save() {
  const data = formData();
  const errors = validateDeliverable(data);
  if (errors.length > 0) {
    showMessage(errors.join(' '), true);
    return;
  }
  localStorage.setItem(storageKey, JSON.stringify(data));
  updatePreview();
  showMessage('入力内容をブラウザ内へ保存しました。');
}

function downloadCurrent() {
  const data = formData();
  const errors = validateDeliverable(data);
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
  previewKind = 'deliverable';
  preview.textContent = 'まだ保存されていません。';
  previewTitle.textContent = '暫定成果物のプレビュー';
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
previewButtons.forEach((button) => {
  button.addEventListener('click', () => {
    previewKind = button.dataset.previewKind;
    updatePreview();
  });
});
previousButton.addEventListener('click', () => showStep(currentStep - 1));
nextButton.addEventListener('click', () => showStep(currentStep + 1));
document.querySelector('#load-scenario').addEventListener('click', () => {
  setFormData(scenario);
  showMessage('固定シナリオを読み込みました。事実、仮定、未確定事項の分け方を確認してください。');
});
document.querySelector('#save-deliverable').addEventListener('click', save);
document.querySelector('#download-current').addEventListener('click', downloadCurrent);
document.querySelector('#clear-deliverable').addEventListener('click', clearSaved);

restore();
showStep(1);
