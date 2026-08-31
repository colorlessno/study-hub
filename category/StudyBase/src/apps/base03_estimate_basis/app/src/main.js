import { calculateTotal, outputs, validateEstimate } from './estimate.js';

const storageKey = 'studyhub:base03:estimate-basis';
const form = document.querySelector('#estimate-form');
const panels = [...document.querySelectorAll('[data-step-panel]')];
const stepButtons = [...document.querySelectorAll('[data-step-button]')];
const previewButtons = [...document.querySelectorAll('[data-preview-kind]')];
const previousButton = document.querySelector('#previous-step');
const nextButton = document.querySelector('#next-step');
const stepPosition = document.querySelector('#step-position');
const status = document.querySelector('#status');
const preview = document.querySelector('#preview');
const previewTitle = document.querySelector('#preview-title');
const total = document.querySelector('#estimate-total');
let currentStep = 1;
let previewKind = 'basis';

const scenario = {
  request: '受注照会画面に「担当者名」検索条件を追加したい。',
  targetScope: '受注照会画面に担当者名検索条件を追加するための調査、設計、実装、テスト。',
  excludedScope: '新規画面の作成\n権限設計の変更\n本番リリース作業',
  assumptions: '既存画面を変更できる\nテスト環境を利用できる\n担当者情報が既存データに存在する',
  estimateDate: '2026-08-24',
  work1Phase: '調査',
  work1Content: '画面、API、DBの影響確認',
  work1Artifact: '調査メモ',
  work1Estimate: '0.5',
  work1Basis: '既存構成の確認が必要',
  work2Phase: '設計',
  work2Content: '入力項目とAPI条件の設計',
  work2Artifact: '設計メモ',
  work2Estimate: '0.5',
  work2Basis: '画面とAPIの整合確認が必要',
  work3Phase: '実装',
  work3Content: '画面とAPIの修正',
  work3Artifact: 'ソース差分',
  work3Estimate: '1.0',
  work3Basis: '既存機能への小規模な項目追加を想定',
  work4Phase: 'テスト',
  work4Content: '検索条件の正常系と未指定を確認',
  work4Artifact: 'テスト結果',
  work4Estimate: '0.5',
  work4Basis: '追加条件の正常系と既存検索への影響確認が必要',
  risk1Risk: '担当者情報が既存DBにない',
  risk1Condition: '画面表示名に対応する項目をDBで確認できない場合',
  risk1Impact: 'DB変更とデータ移行が必要になる',
  risk1Action: '調査段階でDB定義と実データを確認する',
  risk1EstimateImpact: '設計・実装・テストを再見積り',
  risk2Risk: 'APIが複数画面で共用されている',
  risk2Condition: '検索APIの変更が他画面へ影響する場合',
  risk2Impact: '影響調査と回帰テストが増える',
  risk2Action: 'API利用箇所と既存テストを確認する',
  risk2EstimateImpact: '調査とテストを追加',
  reestimateConditions: 'DBに担当者情報が存在しない\n権限制御の変更が必要\nAPIが複数画面で共用されている\n対象範囲に本番リリース作業が追加される',
  notes: '合計2.5人日は、記載した前提と対象範囲に基づく。再見積り条件に該当した時点で見直す。'
};

function workItem(number) {
  const id = `W-${String(number).padStart(2, '0')}`;
  return `<fieldset>
    <legend>${id}</legend>
    <div class="field-grid">
      <label>工程<input name="work${number}Phase"></label>
      <label>成果物<input name="work${number}Artifact"></label>
    </div>
    <label>作業内容<textarea name="work${number}Content" rows="2"></textarea></label>
    <div class="field-grid">
      <label>見積り（人日）<input name="work${number}Estimate" type="number" min="0.1" step="0.1"></label>
      <label>根拠<textarea name="work${number}Basis" rows="2"></textarea></label>
    </div>
  </fieldset>`;
}

function riskItem(number) {
  const id = `R-${String(number).padStart(2, '0')}`;
  return `<fieldset>
    <legend>${id}</legend>
    <div class="field-grid">
      <label>リスク<textarea name="risk${number}Risk" rows="2"></textarea></label>
      <label>発生条件<textarea name="risk${number}Condition" rows="2"></textarea></label>
      <label>影響<textarea name="risk${number}Impact" rows="2"></textarea></label>
      <label>対策<textarea name="risk${number}Action" rows="2"></textarea></label>
    </div>
    <label>見積りへの影響<input name="risk${number}EstimateImpact"></label>
  </fieldset>`;
}

document.querySelector('#work-items').innerHTML = [1, 2, 3, 4].map(workItem).join('');
document.querySelector('#risk-items').innerHTML = [1, 2].map(riskItem).join('');

function formData() {
  return Object.fromEntries(new FormData(form).entries());
}

function setFormData(data) {
  for (const [name, value] of Object.entries(data)) {
    const field = form.elements.namedItem(name);
    if (field && typeof value === 'string') field.value = value;
  }
  updateTotal();
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

function updateTotal() {
  total.textContent = calculateTotal(formData()).toFixed(1);
}

function updatePreview() {
  const output = outputs[previewKind];
  preview.textContent = output.build(formData());
  previewTitle.textContent = `${output.title}のプレビュー`;
  previewButtons.forEach((button) => {
    button.classList.toggle('selected', button.dataset.previewKind === previewKind);
  });
  updateTotal();
}

function save() {
  const data = formData();
  const errors = validateEstimate(data);
  if (errors.length > 0) {
    showMessage(errors.join(' '), true);
    return;
  }
  localStorage.setItem(storageKey, JSON.stringify(data));
  updatePreview();
  showMessage('見積り根拠をブラウザ内へ保存しました。');
}

function downloadCurrent() {
  const data = formData();
  const errors = validateEstimate(data);
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
  previewKind = 'basis';
  preview.textContent = 'まだ保存されていません。';
  previewTitle.textContent = '見積り根拠表のプレビュー';
  showMessage('');
  updateTotal();
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
form.addEventListener('input', updateTotal);
document.querySelector('#load-scenario').addEventListener('click', () => {
  setFormData(scenario);
  showMessage('固定シナリオを読み込みました。作業の内訳と再見積り条件を確認してください。');
});
document.querySelector('#save-estimate').addEventListener('click', save);
document.querySelector('#download-current').addEventListener('click', downloadCurrent);
document.querySelector('#clear-estimate').addEventListener('click', clearSaved);

restore();
showStep(1);
