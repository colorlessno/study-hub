const validExample = `code,name,price
P001,Pen,120
P002,"Notebook, A5",300
P003,Eraser,80
P004,Ruler,150`;
const invalidExample = `code,name,price
P001,,abc
,Notebook,300`;

const fileInput = document.querySelector('#csvFile');
const checkButton = document.querySelector('#check');
const sendValidButton = document.querySelector('#sendValid');
const sendInvalidButton = document.querySelector('#sendInvalid');
const resultOutput = document.querySelector('#out');
const controls = [fileInput, checkButton, sendValidButton, sendInvalidButton];
let sending = false;

function setBusy(busy) {
  sending = busy;
  for (const control of controls) control.disabled = busy;
}

async function sendFile(file) {
  if (sending) return;
  setBusy(true);
  resultOutput.textContent = '検証APIへ送信中...';
  const form = new FormData();
  form.append('file', file);
  try {
    const response = await fetch('/api/csv/validate', { method: 'POST', body: form });
    const result = await response.json();
    resultOutput.textContent = JSON.stringify({ httpStatus: response.status, ...result }, null, 2);
  } catch (error) {
    resultOutput.textContent = error instanceof Error ? error.message : '送信に失敗しました。';
  } finally {
    setBusy(false);
  }
}

function exampleFile(content, name) {
  return new File([content], name, { type: 'text/csv' });
}

sendValidButton.addEventListener('click', () => sendFile(exampleFile(validExample, 'valid.csv')));
sendInvalidButton.addEventListener('click', () => sendFile(exampleFile(invalidExample, 'invalid.csv')));
checkButton.addEventListener('click', () => {
  const [file] = fileInput.files;
  if (!file) {
    resultOutput.textContent = 'CSVファイルを選択してください。';
    return;
  }
  sendFile(file);
});

resultOutput.textContent = '確認用CSVを送信するか、手元のCSVファイルを選択してください。';
