import http from 'node:http';
import { readOption, readPort, sendJson, stopOnSignal } from './args.mjs';

const port = readPort(43101);
const title = readOption('title', '疑似Web教材');
const apiUrl = readOption('api-url');

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function page() {
  const safeTitle = escapeHtml(title);
  const apiScript = apiUrl
    ? `
      const response = await fetch(${JSON.stringify(apiUrl)}, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: document.querySelector('#input').value })
      });
      document.querySelector('#result').textContent = JSON.stringify(await response.json(), null, 2);`
    : `
      count += 1;
      document.querySelector('#result').textContent = '実行回数: ' + count;`;

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    body { max-width: 720px; margin: 32px auto; padding: 0 20px; font-family: sans-serif; }
    input, button { padding: 8px; }
    pre { min-height: 80px; padding: 12px; background: #eee; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>${safeTitle}</h1>
  <p>StudyHub が起動したローカル教材です。</p>
  <input id="input" value="sample">
  <button id="run" type="button">実行</button>
  <pre id="result">未実行</pre>
  <script>
    let count = 0;
    document.querySelector('#run').addEventListener('click', async () => {${apiScript}
    });
  </script>
</body>
</html>`;
}

const server = http.createServer((request, response) => {
  if (request.url === '/health') {
    sendJson(response, 200, { status: 'ready', title });
    return;
  }

  const body = page();
  response.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'content-length': Buffer.byteLength(body)
  });
  response.end(body);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`${title} を http://127.0.0.1:${port}/ で起動しました。`);
});
stopOnSignal(server);
