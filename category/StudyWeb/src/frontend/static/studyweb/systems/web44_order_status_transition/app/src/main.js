const allowed = {
  draft: ['confirmed', 'canceled'],
  confirmed: ['shipped', 'canceled'],
  shipped: ['completed'],
  completed: [],
  canceled: [],
};
const statusNames = {
  draft: '下書き',
  confirmed: '確認済み',
  shipped: '発送済み',
  completed: '完了',
  canceled: '取消',
};

const nextSelect = document.querySelector('#next');
const changeButton = document.querySelector('#go');
const resetButton = document.querySelector('#reset');
const messageOutput = document.querySelector('#message');
const currentStatusOutput = document.querySelector('#currentStatus');
const historyOutput = document.querySelector('#history');

let order;

function createInitialOrder() {
  return { id: 1, status: 'draft', history: ['draft'] };
}

function render(message) {
  messageOutput.textContent = message;
  currentStatusOutput.textContent = statusNames[order.status];
  historyOutput.textContent = order.history.map((status) => statusNames[status]).join(' → ');
}

changeButton.addEventListener('click', () => {
  const target = nextSelect.value;
  if (!allowed[order.status].includes(target)) {
    render(`${statusNames[order.status]}から${statusNames[target]}へは変更できません。`);
    return;
  }

  const previous = order.status;
  order.status = target;
  order.history.push(target);
  render(`${statusNames[previous]}から${statusNames[target]}へ変更しました。`);
});

resetButton.addEventListener('click', () => {
  order = createInitialOrder();
  nextSelect.value = 'confirmed';
  render('初期状態に戻しました。');
});

order = createInitialOrder();
render('初期状態です。');
