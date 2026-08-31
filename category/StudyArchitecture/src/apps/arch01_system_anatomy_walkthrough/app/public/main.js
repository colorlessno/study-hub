const resultElement = document.querySelector('#operation-result');
const readyElement = document.querySelector('#ready-result');

async function request(path, options) {
  const response = await fetch(path, options);
  const body = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${body.error ?? body.status}`);
  return body;
}

async function loadSystemMap() {
  const data = await request('/api/system-map');
  document.querySelector('#system-flow').replaceChildren(
    ...data.representativeFlow.map((step) => {
      const item = document.createElement('li');
      item.textContent = step;
      return item;
    })
  );
}

async function loadOrders() {
  const data = await request('/api/orders');
  document.querySelector('#orders').replaceChildren(
    ...data.orders.map((order) => {
      const row = document.createElement('tr');
      for (const value of [order.id, order.title, order.createdAt]) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      }
      return row;
    })
  );
}

async function loadLogs() {
  const data = await request('/api/logs');
  document.querySelector('#logs').replaceChildren(
    ...data.logs.map((log) => {
      const row = document.createElement('tr');
      for (const value of [log.traceId, `${log.method} ${log.path}`, log.statusCode, log.message]) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      }
      return row;
    })
  );
}

document.querySelector('#order-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const data = await request('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: document.querySelector('#order-title').value })
    });
    resultElement.textContent = `保存しました。Trace ID: ${data.traceId}`;
    await loadOrders();
    await loadLogs();
  } catch (error) {
    resultElement.textContent = `保存できませんでした。${error.message}`;
    await loadLogs();
  }
});

async function setFailureMode(enabled) {
  const data = await request('/api/failure-mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled })
  });
  resultElement.textContent = data.failureMode ? '障害モードを開始しました。' : '復旧しました。';
  await loadLogs();
}

document.querySelector('#failure-on').addEventListener('click', () => setFailureMode(true));
document.querySelector('#failure-off').addEventListener('click', () => setFailureMode(false));
document.querySelector('#check-ready').addEventListener('click', async () => {
  try {
    readyElement.textContent = JSON.stringify(await request('/ready'), null, 2);
  } catch (error) {
    readyElement.textContent = error.message;
  }
  await loadLogs();
});
document.querySelector('#reload-orders').addEventListener('click', loadOrders);
document.querySelector('#reload-logs').addEventListener('click', loadLogs);

await loadSystemMap();
await loadOrders();
await loadLogs();
