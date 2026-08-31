import { buildTableState } from './table-state.js';

const data = Array.from({ length: 17 }, (_, index) => ({
  id: index + 1,
  name: `Item ${String.fromCharCode(65 + (index % 26))}${index}`,
  status: index % 2 ? 'open' : 'closed'
}));

const elements = {
  keyword: document.querySelector('#q'),
  status: document.querySelector('#status'),
  displayState: document.querySelector('#display-state'),
  sort: document.querySelector('#toggle'),
  previous: document.querySelector('#prev'),
  next: document.querySelector('#next'),
  info: document.querySelector('#info'),
  table: document.querySelector('#results-table'),
  rows: document.querySelector('#rows')
};

let currentPage = 0;
let ascending = true;

function addMessageRow(message, className) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 3;
  cell.className = className;
  cell.textContent = message;
  row.append(cell);
  elements.rows.replaceChildren(row);
}

function addDataRows(items) {
  const fragment = document.createDocumentFragment();

  for (const item of items) {
    const row = document.createElement('tr');
    const idCell = document.createElement('td');
    const nameCell = document.createElement('td');
    const statusCell = document.createElement('td');

    idCell.textContent = String(item.id);
    nameCell.textContent = item.name;
    statusCell.textContent = item.status === 'open' ? '対応中' : '完了';
    row.append(idCell, nameCell, statusCell);
    fragment.append(row);
  }

  elements.rows.replaceChildren(fragment);
}

function render() {
  const displayState = elements.displayState.value;
  const isSimulatedState = displayState !== 'success';

  elements.table.setAttribute('aria-busy', displayState === 'loading' ? 'true' : 'false');
  elements.sort.textContent = `名前順: ${ascending ? '昇順' : '降順'}`;
  elements.sort.setAttribute('aria-pressed', ascending ? 'false' : 'true');

  if (displayState === 'loading') {
    elements.info.textContent = '一覧を読み込んでいます。';
    addMessageRow('読込中です。', 'state-message');
  } else if (displayState === 'error') {
    elements.info.textContent = '一覧を読み込めませんでした。';
    addMessageRow('読込エラーです。通常表示に戻して再確認してください。', 'state-message state-error');
  } else {
    const state = buildTableState(data, {
      keyword: elements.keyword.value,
      status: elements.status.value,
      ascending,
      page: currentPage
    });

    currentPage = state.page;
    elements.info.textContent = state.filteredCount === 0
      ? '0件 / 0ページ'
      : `${state.filteredCount}件中 ${state.rangeStart}〜${state.rangeEnd}件 / ${state.totalPages}ページ中 ${state.page + 1}ページ目`;

    if (state.items.length === 0) {
      addMessageRow('条件に一致するデータはありません。', 'state-message');
    } else {
      addDataRows(state.items);
    }

    elements.previous.disabled = !state.hasPrevious;
    elements.next.disabled = !state.hasNext;
  }

  if (isSimulatedState) {
    elements.previous.disabled = true;
    elements.next.disabled = true;
  }
}

elements.keyword.addEventListener('input', () => {
  currentPage = 0;
  render();
});

elements.status.addEventListener('change', () => {
  currentPage = 0;
  render();
});

elements.displayState.addEventListener('change', render);

elements.sort.addEventListener('click', () => {
  ascending = !ascending;
  currentPage = 0;
  render();
});

elements.previous.addEventListener('click', () => {
  currentPage -= 1;
  render();
});

elements.next.addEventListener('click', () => {
  currentPage += 1;
  render();
});

render();
