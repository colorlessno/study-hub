async function request(path, options) {
  const response = await fetch(path, options);
  const body = await response.json();
  return { response, body };
}

function replaceRows(selector, rows, columns) {
  document.querySelector(selector).replaceChildren(
    ...rows.map((value) => {
      const row = document.createElement('tr');
      for (const column of columns) {
        const cell = document.createElement('td');
        cell.textContent = value[column];
        row.append(cell);
      }
      return row;
    })
  );
}

async function loadScope() {
  const { body } = await request('/api/review-scope');
  document.querySelector('#review-scope').textContent = JSON.stringify(body, null, 2);
}

async function loadTasks() {
  const { body } = await request('/api/tasks');
  replaceRows('#tasks', body.tasks, ['id', 'title', 'createdAt']);
}

async function loadReviews() {
  const { body } = await request('/api/reviews');
  replaceRows('#reviews', body.reviews, ['evidenceType', 'finding', 'impact', 'status', 'residualRisk']);
}

document.querySelector('#task-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const { response, body } = await request('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: document.querySelector('#task-title').value })
  });
  document.querySelector('#api-evidence').textContent = JSON.stringify({
    statusCode: response.status,
    response: body
  }, null, 2);
  await loadTasks();
});

document.querySelector('#load-health').addEventListener('click', async () => {
  const health = await request('/health');
  const ready = await request('/ready');
  document.querySelector('#runtime-evidence').textContent = JSON.stringify({
    health: { statusCode: health.response.status, body: health.body },
    ready: { statusCode: ready.response.status, body: ready.body }
  }, null, 2);
});

document.querySelector('#load-logs').addEventListener('click', async () => {
  const { body } = await request('/api/logs');
  document.querySelector('#runtime-evidence').textContent = JSON.stringify(body, null, 2);
});

document.querySelector('#review-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const review = Object.fromEntries(form.entries());
  const { response, body } = await request('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(review)
  });
  document.querySelector('#review-result').textContent = response.ok
    ? `保存しました。Trace ID: ${body.traceId}`
    : `保存できませんでした。${body.error}`;
  await loadReviews();
});

await loadScope();
await loadTasks();
await loadReviews();
