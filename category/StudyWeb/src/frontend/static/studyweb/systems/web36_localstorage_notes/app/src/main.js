function connectStorageControls({ storage, key, prefix }) {
  const valueInput = document.querySelector(`#${prefix}-value`);
  const saveButton = document.querySelector(`#${prefix}-save`);
  const loadButton = document.querySelector(`#${prefix}-load`);
  const clearButton = document.querySelector(`#${prefix}-clear`);
  const output = document.querySelector(`#${prefix}-out`);

  saveButton.onclick = () => {
    storage.setItem(key, valueInput.value);
    output.textContent = `${key}へ保存しました。`;
  };

  loadButton.onclick = () => {
    const savedValue = storage.getItem(key);
    output.textContent = savedValue === null ? '保存された値はありません。' : savedValue;
  };

  clearButton.onclick = () => {
    storage.removeItem(key);
    output.textContent = `${key}を削除しました。`;
  };
}

connectStorageControls({
  storage: localStorage,
  key: 'studyweb.web36.memo',
  prefix: 'local'
});

connectStorageControls({
  storage: sessionStorage,
  key: 'studyweb.web36.sessionMemo',
  prefix: 'session'
});
