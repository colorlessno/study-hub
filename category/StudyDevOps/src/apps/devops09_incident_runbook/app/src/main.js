import {
  STORAGE_KEY,
  buildMarkdown,
  initialReport,
  normalizeReport,
  safeFileName,
  validateReport
} from './report.js';

const fieldIds = {
  incidentId: 'incident-id',
  detectedAt: 'detected-at',
  detectedBy: 'detected-by',
  status: 'status',
  investigator: 'investigator',
  decisionMaker: 'decision-maker',
  summary: 'summary',
  impact: 'impact',
  unknownScope: 'unknown-scope',
  severity: 'severity',
  severityReason: 'severity-reason',
  healthReady: 'health-ready',
  containerStatus: 'container-status',
  requestEvidence: 'request-evidence',
  recentChange: 'recent-change',
  facts: 'facts',
  hypothesis: 'hypothesis',
  decision: 'decision',
  temporaryAction: 'temporary-action',
  recoveryCheck: 'recovery-check',
  permanentAction: 'permanent-action',
  prevention: 'prevention'
};

const elements = Object.fromEntries(
  Object.entries(fieldIds).map(([key, id]) => [key, document.getElementById(id)])
);
const panels = [...document.querySelectorAll('[data-panel]')];
const tabs = [...document.querySelectorAll('[data-step]')];
const stepPosition = document.getElementById('step-position');
const previousStep = document.getElementById('previous-step');
const nextStep = document.getElementById('next-step');
const saveStatus = document.getElementById('save-status');
const markdownPreview = document.getElementById('markdown-preview');
let currentStep = 0;
let savedMarkdown = '';

function readStoredReport() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeReport(JSON.parse(stored)) : normalizeReport(initialReport);
  } catch {
    return normalizeReport(initialReport);
  }
}

function collectReport() {
  return normalizeReport(Object.fromEntries(
    Object.entries(elements).map(([key, element]) => [key, element.value])
  ));
}

function applyReport(report) {
  for (const [key, element] of Object.entries(elements)) {
    element.value = report[key];
  }
  savedMarkdown = report.updatedAt ? buildMarkdown(report) : '';
  markdownPreview.textContent = savedMarkdown || 'まだ保存されていません。';
  saveStatus.textContent = report.updatedAt
    ? `保存済み: ${report.updatedAt}`
    : '保存された記録はありません。';
}

function showStep(step) {
  currentStep = Math.max(0, Math.min(step, panels.length - 1));
  panels.forEach((panel, index) => {
    panel.hidden = index !== currentStep;
  });
  tabs.forEach((tab, index) => {
    if (index === currentStep) tab.setAttribute('aria-current', 'step');
    else tab.removeAttribute('aria-current');
  });
  previousStep.disabled = currentStep === 0;
  nextStep.disabled = currentStep === panels.length - 1;
  stepPosition.textContent = `${currentStep + 1} / ${panels.length}`;
}

function saveReport() {
  const report = collectReport();
  const errors = validateReport(report);
  if (errors.length > 0) {
    saveStatus.textContent = errors.join(' ');
    saveStatus.className = 'save-status error';
    return;
  }
  report.updatedAt = new Date().toLocaleString('ja-JP');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
  savedMarkdown = buildMarkdown(report);
  markdownPreview.textContent = savedMarkdown;
  saveStatus.textContent = `保存しました: ${report.updatedAt}`;
  saveStatus.className = 'save-status success';
}

function downloadReport() {
  const report = collectReport();
  const errors = validateReport(report);
  if (errors.length > 0) {
    saveStatus.textContent = `${errors.join(' ')} 入力後にダウンロードしてください。`;
    saveStatus.className = 'save-status error';
    return;
  }
  const markdown = buildMarkdown({
    ...report,
    updatedAt: report.updatedAt || new Date().toLocaleString('ja-JP')
  });
  const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFileName(report.incidentId);
  link.click();
  URL.revokeObjectURL(url);
  saveStatus.textContent = 'Markdownをダウンロードしました。';
  saveStatus.className = 'save-status success';
}

function clearReport() {
  localStorage.removeItem(STORAGE_KEY);
  applyReport(normalizeReport(initialReport));
  saveStatus.textContent = '保存内容をクリアしました。';
  saveStatus.className = 'save-status';
  showStep(0);
}

tabs.forEach((tab) => tab.addEventListener('click', () => showStep(Number(tab.dataset.step))));
previousStep.addEventListener('click', () => showStep(currentStep - 1));
nextStep.addEventListener('click', () => showStep(currentStep + 1));
document.getElementById('save-report').addEventListener('click', saveReport);
document.getElementById('download-report').addEventListener('click', downloadReport);
document.getElementById('clear-report').addEventListener('click', clearReport);

applyReport(readStoredReport());
showStep(0);
