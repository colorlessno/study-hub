import { analyzeRaci, outputs } from './raci.js';

const storageKey = 'studyhub:base05:raci';
const form = document.querySelector('#raci-form');
const panels = [...document.querySelectorAll('[data-step-panel]')];
const stepButtons = [...document.querySelectorAll('[data-step-button]')];
const previewButtons = [...document.querySelectorAll('[data-preview-kind]')];
const previousButton = document.querySelector('#previous-step');
const nextButton = document.querySelector('#next-step');
const stepPosition = document.querySelector('#step-position');
const analysisTitle = document.querySelector('#analysis-title');
const analysisSummary = document.querySelector('#analysis-summary');
const status = document.querySelector('#status');
const preview = document.querySelector('#preview');
const previewTitle = document.querySelector('#preview-title');
let currentStep = 1;
let previewKind = 'raci';

const scenario = {
  projectName: '既存受注システムの改修方針決定',
  scope: '既存仕様の調査から改修範囲、テストデータ、リリース日の決定まで',
  stakeholders: '開発担当\n開発リーダー\n依頼者\n依頼部門責任者\n業務担当\n業務リーダー\n運用担当\n運用責任者',
  work1Task: '既存仕様調査',
  work1Responsible: '開発担当',
  work1Accountable: '開発リーダー',
  work1Consulted: '業務担当',
  work1Informed: '依頼者',
  work1Note: '調査結果を共有する',
  work2Task: '改修範囲決定',
  work2Responsible: '依頼者',
  work2Accountable: '依頼部門責任者',
  work2Consulted: '開発リーダー',
  work2Informed: '開発担当',
  work2Note: '依頼部門の承認が必要',
  work3Task: 'テストデータ準備',
  work3Responsible: '業務担当',
  work3Accountable: '業務リーダー',
  work3Consulted: '開発担当',
  work3Informed: '開発リーダー',
  work3Note: '提供期限を確認する',
  work4Task: 'リリース日調整',
  work4Responsible: '運用担当',
  work4Accountable: '運用責任者',
  work4Consulted: '開発リーダー、依頼部門責任者',
  work4Informed: '開発担当、依頼者',
  work4Note: '保守時間帯と業務予定を確認する',
  decision1Id: 'D-01',
  decision1Content: '改修範囲',
  decision1DecisionMaker: '依頼部門責任者',
  decision1Deadline: '次回定例まで',
  decision1Impact: '見積りを確定できない',
  decision1Status: '未決定',
  escalation1Id: 'E-01',
  escalation1Issue: 'テストデータの提供元',
  escalation1Reason: '提供責任を持つ役割が依頼時点で示されていない',
  escalation1Impact: '結合テストを開始できない',
  escalation1RequestTo: '業務リーダー',
  escalation1Deadline: 'テスト開始の3営業日前まで',
  escalation1Status: '依頼済み'
};

function workItem(number) {
  return `<fieldset>
    <legend>W-${String(number).padStart(2, '0')} 作業 ${number}</legend>
    <label>作業<input name="work${number}Task"></label>
    <div class="field-grid">
      <label>Responsible（実施者）<input name="work${number}Responsible"></label>
      <label>Accountable（最終承認者）<input name="work${number}Accountable"></label>
      <label>Consulted（相談先）<input name="work${number}Consulted"></label>
      <label>Informed（共有先）<input name="work${number}Informed"></label>
    </div>
    <label>備考<input name="work${number}Note"></label>
  </fieldset>`;
}

function decisionItem(number) {
  return `<fieldset>
    <legend>判断待ち ${number}</legend>
    <div class="field-grid">
      <label>ID<input name="decision${number}Id" value="D-${String(number).padStart(2, '0')}"></label>
      <label>状態<select name="decision${number}Status"><option>未決定</option><option>相談中</option><option>決定済み</option></select></label>
    </div>
    <label>内容<input name="decision${number}Content"></label>
    <div class="field-grid">
      <label>決定者<input name="decision${number}DecisionMaker"></label>
      <label>期限<input name="decision${number}Deadline"></label>
    </div>
    <label>未決時の影響<textarea name="decision${number}Impact" rows="2"></textarea></label>
  </fieldset>`;
}

function escalationItem(number) {
  return `<fieldset>
    <legend>エスカレーション ${number}</legend>
    <div class="field-grid">
      <label>ID<input name="escalation${number}Id" value="E-${String(number).padStart(2, '0')}"></label>
      <label>状態<select name="escalation${number}Status"><option>未依頼</option><option>依頼済み</option><option>解決</option></select></label>
    </div>
    <label>決められない事項<input name="escalation${number}Issue"></label>
    <div class="field-grid">
      <label>理由<textarea name="escalation${number}Reason" rows="2"></textarea></label>
      <label>影響<textarea name="escalation${number}Impact" rows="2"></textarea></label>
      <label>依頼先<input name="escalation${number}RequestTo"></label>
      <label>期限<input name="escalation${number}Deadline"></label>
    </div>
  </fieldset>`;
}

document.querySelector('#work-items').innerHTML = [1, 2, 3, 4].map(workItem).join('');
document.querySelector('#decision-items').innerHTML = [1, 2].map(decisionItem).join('');
document.querySelector('#escalation-items').innerHTML = [1, 2].map(escalationItem).join('');

function formData() {
  return Object.fromEntries(new FormData(form).entries());
}

function setFormData(data) {
  for (const [name, value] of Object.entries(data)) {
    const field = form.elements.namedItem(name);
    if (field && typeof value === 'string') field.value = value;
  }
  updateAnalysis(false);
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

function updateAnalysis(showErrors) {
  const result = analyzeRaci(formData());
  analysisTitle.textContent = result.ok ? '整合性を確認しました' : '確認が必要な項目があります';
  analysisTitle.dataset.result = result.ok ? 'ok' : 'needs-review';
  analysisSummary.textContent = `作業分担 ${result.workCount}件 / 判断待ち ${result.decisionCount}件 / エスカレーション ${result.escalationCount}件`;
  if (showErrors) showMessage(result.ok ? 'RACIと関連一覧の入力は整合しています。' : result.errors.join(' '), !result.ok);
  return result;
}

function updatePreview() {
  const output = outputs[previewKind];
  preview.textContent = output.build(formData());
  previewTitle.textContent = `${output.title}のプレビュー`;
  previewButtons.forEach((button) => {
    button.classList.toggle('selected', button.dataset.previewKind === previewKind);
  });
  updateAnalysis(false);
}

function save() {
  const result = updateAnalysis(true);
  if (!result.ok) return;
  localStorage.setItem(storageKey, JSON.stringify(formData()));
  updatePreview();
  showMessage('責任分担の入力内容をブラウザ内へ保存しました。');
}

function downloadCurrent() {
  const result = updateAnalysis(true);
  if (!result.ok) return;
  const output = outputs[previewKind];
  const url = URL.createObjectURL(new Blob([output.build(formData())], { type: 'text/markdown;charset=utf-8' }));
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
  previewKind = 'raci';
  preview.textContent = 'まだ保存されていません。';
  previewTitle.textContent = 'RACI表のプレビュー';
  showMessage('');
  updateAnalysis(false);
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
  showMessage('固定シナリオを読み込みました。R、A、C、Iと判断待ちの関係を確認してください。');
});
document.querySelector('#validate-raci').addEventListener('click', () => updateAnalysis(true));
document.querySelector('#save-raci').addEventListener('click', save);
document.querySelector('#download-current').addEventListener('click', downloadCurrent);
document.querySelector('#clear-raci').addEventListener('click', clearSaved);
form.addEventListener('input', () => updateAnalysis(false));
form.addEventListener('change', () => updateAnalysis(false));

restore();
updateAnalysis(false);
showStep(1);
