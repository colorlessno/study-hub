const loadAButton = document.querySelector('#loadA');
const loadBButton = document.querySelector('#loadB');
const saveAButton = document.querySelector('#saveA');
const saveBButton = document.querySelector('#saveB');
const resetButton = document.querySelector('#reset');
const nameAInput = document.querySelector('#nameA');
const nameBInput = document.querySelector('#nameB');
const messageOutput = document.querySelector('#message');
const httpStatusOutput = document.querySelector('#httpStatus');
const currentRecordOutput = document.querySelector('#currentRecord');
const snapshotAOutput = document.querySelector('#snapshotA');
const snapshotBOutput = document.querySelector('#snapshotB');

let record = null;
let snapshotA;
let snapshotB;
let operationInProgress = false;
const operationButtons = [loadAButton, loadBButton, saveAButton, saveBButton, resetButton];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function format(value) {
  return value ? JSON.stringify(value) : '未読込';
}

function render(message) {
  messageOutput.textContent = message;
  currentRecordOutput.textContent = format(record);
  snapshotAOutput.textContent = format(snapshotA);
  snapshotBOutput.textContent = format(snapshotB);
}

function setBusy(busy) {
  operationInProgress = busy;
  for (const button of operationButtons) button.disabled = busy;
  nameAInput.disabled = busy || !snapshotA;
  nameBInput.disabled = busy || !snapshotB;
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json();
  httpStatusOutput.textContent = `${response.status} ${response.statusText}`;
  return { response, body };
}

async function load(label) {
  const { response, body } = await request('/api/record');
  if (!response.ok) throw new Error(body.message || '読込に失敗しました。');
  record = body;
  if (label === 'A') {
    snapshotA = clone(body);
    nameAInput.value = body.name;
  } else {
    snapshotB = clone(body);
    nameBInput.value = body.name;
  }
  render(`利用者${label}がAPIから版${body.version}を読み込みました。`);
}

async function save(snapshot, label, nameInput) {
  if (!snapshot) {
    render(`利用者${label}: 保存前に読み込んでください。`);
    return;
  }
  const name = nameInput.value.trim();
  if (!name) {
    render(`利用者${label}: 更新内容を入力してください。`);
    nameInput.focus();
    return;
  }
  const { response, body } = await request('/api/record', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      version: snapshot.version,
    }),
  });
  record = body.current || body;
  if (response.status === 409) {
    render(`利用者${label}: HTTP 409 更新競合 現在の版=${record.version} 読込時の版=${snapshot.version}`);
    return;
  }
  if (!response.ok) throw new Error(body.message || '保存に失敗しました。');
  render(`利用者${label}: APIで保存しました。現在の版=${record.version}`);
}

async function run(action) {
  if (operationInProgress) return;
  setBusy(true);
  try {
    await action();
  } catch (error) {
    render(error instanceof Error ? error.message : '操作に失敗しました。');
  } finally {
    setBusy(false);
  }
}

loadAButton.addEventListener('click', () => run(() => load('A')));
loadBButton.addEventListener('click', () => run(() => load('B')));
saveAButton.addEventListener('click', () => run(() => save(snapshotA, 'A', nameAInput)));
saveBButton.addEventListener('click', () => run(() => save(snapshotB, 'B', nameBInput)));

resetButton.addEventListener('click', () => run(async () => {
  const { response, body } = await request('/api/reset', { method: 'POST' });
  if (!response.ok) throw new Error(body.message || '初期化に失敗しました。');
  record = body;
  snapshotA = null;
  snapshotB = null;
  nameAInput.value = '';
  nameBInput.value = '';
  render('APIのデータを初期状態に戻しました。');
}));

snapshotA = null;
snapshotB = null;
setBusy(false);
run(async () => {
  const { response, body } = await request('/api/record');
  if (!response.ok) throw new Error(body.message || '初期状態の読込に失敗しました。');
  record = body;
  render('APIから初期状態を読み込みました。');
});
