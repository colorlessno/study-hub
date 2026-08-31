import {
  formatFileSize,
  getSampleFileMetadata,
  validateFileMetadata
} from './file-validation.js';

const elements = {
  file: document.querySelector('#file'),
  reset: document.querySelector('#reset'),
  result: document.querySelector('#result'),
  status: document.querySelector('#result-status'),
  name: document.querySelector('#result-name'),
  size: document.querySelector('#result-size'),
  type: document.querySelector('#result-type'),
  errors: document.querySelector('#result-errors')
};

function resetResult() {
  elements.file.value = '';
  elements.result.dataset.state = 'empty';
  elements.status.textContent = '確認データのボタンを押すか、PDFを選んでください。';
  elements.name.textContent = '未選択';
  elements.size.textContent = '未選択';
  elements.type.textContent = '未選択';
  elements.errors.replaceChildren();
  elements.errors.hidden = true;
}

function showResult(file) {
  const result = validateFileMetadata(file);
  elements.result.dataset.state = result.errors.length === 0 ? 'valid' : 'invalid';
  elements.status.textContent = result.errors.length === 0
    ? '問題は見つかりませんでした。'
    : `${result.errors.length}件の問題が見つかりました。`;
  elements.name.textContent = result.name;
  elements.size.textContent = formatFileSize(result.size);
  elements.type.textContent = result.type || 'ブラウザから通知されていません';
  elements.errors.replaceChildren(...result.errors.map((message) => {
    const item = document.createElement('li');
    item.textContent = message;
    return item;
  }));
  elements.errors.hidden = result.errors.length === 0;
}

for (const button of document.querySelectorAll('[data-sample]')) {
  button.addEventListener('click', () => {
    elements.file.value = '';
    showResult(getSampleFileMetadata(button.dataset.sample));
  });
}

elements.file.addEventListener('change', () => {
  const [file] = elements.file.files;
  if (file) showResult(file);
});

elements.reset.addEventListener('click', resetResult);

resetResult();
