import {
  DISPLAY_METHODS,
  SCENARIOS,
  STRATEGIES,
  emptyMemo,
  formatMemo,
  validateMemo
} from './decision-memo.js';

const STORAGE_KEY = 'studyhub:web52:decision-memos';
const scenarioSelect = document.querySelector('#scenario-select');
const scenarioConditions = document.querySelector('#scenario-conditions');
const scenarioHint = document.querySelector('#scenario-hint');
const savedCount = document.querySelector('#saved-count');
const methodOptions = document.querySelector('#method-options');
const strategyOptions = document.querySelector('#strategy-options');
const form = document.querySelector('#decision-form');
const clearButton = document.querySelector('#clear-current');
const message = document.querySelector('#message');
const preview = document.querySelector('#memo-preview');

function loadMemos() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return stored && typeof stored === 'object' ? stored : {};
  } catch {
    return {};
  }
}

function saveMemos(memos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
}

let memos = loadMemos();

function createChoices(target, choices, type, name) {
  for (const choice of choices) {
    const label = document.createElement('label');
    label.className = 'choice';
    label.innerHTML = `
      <input type="${type}" name="${name}" value="${choice.id}">
      <span><strong>${choice.label}</strong><small>${choice.description}</small></span>
    `;
    target.append(label);
  }
}

function updateSavedCount() {
  const count = SCENARIOS.filter((scenario) => memos[scenario.id]).length;
  savedCount.textContent = `保存済み ${count}/${SCENARIOS.length}`;
}

function readForm() {
  const data = new FormData(form);
  return {
    scenarioId: scenarioSelect.value,
    method: String(data.get('method') ?? ''),
    strategies: data.getAll('strategies').map(String),
    reason: String(data.get('reason') ?? ''),
    responsibilities: String(data.get('responsibilities') ?? ''),
    cacheBoundary: String(data.get('cacheBoundary') ?? ''),
    rejected: String(data.get('rejected') ?? ''),
    risk: String(data.get('risk') ?? '')
  };
}

function writeForm(memo) {
  form.reset();
  const method = form.elements.namedItem('method');
  if (memo.method && method instanceof RadioNodeList) method.value = memo.method;
  for (const checkbox of form.querySelectorAll('input[name="strategies"]')) {
    checkbox.checked = memo.strategies.includes(checkbox.value);
  }
  for (const name of ['reason', 'responsibilities', 'cacheBoundary', 'rejected', 'risk']) {
    form.elements.namedItem(name).value = memo[name];
  }
}

function showScenario() {
  const scenario = SCENARIOS.find((item) => item.id === scenarioSelect.value);
  scenarioConditions.replaceChildren();
  for (const [term, value] of Object.entries(scenario.conditions)) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<dt>${term}</dt><dd>${value}</dd>`;
    scenarioConditions.append(...wrapper.children);
  }
  scenarioHint.textContent = scenario.hint;

  const memo = memos[scenario.id] ?? emptyMemo(scenario.id);
  writeForm(memo);
  preview.textContent = memos[scenario.id] ? formatMemo(memo) : 'まだ保存されていません。';
  message.textContent = '';
}

for (const scenario of SCENARIOS) {
  scenarioSelect.add(new Option(scenario.title, scenario.id));
}
createChoices(methodOptions, DISPLAY_METHODS, 'radio', 'method');
createChoices(strategyOptions, STRATEGIES, 'checkbox', 'strategies');

scenarioSelect.addEventListener('change', showScenario);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const memo = readForm();
  const errors = validateMemo(memo);
  if (errors.length) {
    message.textContent = errors.join(' ');
    return;
  }

  memos[memo.scenarioId] = memo;
  saveMemos(memos);
  preview.textContent = formatMemo(memo);
  message.textContent = '判断メモをブラウザ内に保存しました。';
  updateSavedCount();
});

clearButton.addEventListener('click', () => {
  const scenarioId = scenarioSelect.value;
  delete memos[scenarioId];
  saveMemos(memos);
  writeForm(emptyMemo(scenarioId));
  preview.textContent = 'まだ保存されていません。';
  message.textContent = '';
  updateSavedCount();
});

updateSavedCount();
showScenario();
