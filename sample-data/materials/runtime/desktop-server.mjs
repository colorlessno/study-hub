import http from 'node:http';
import { readPort, sendJson, stopOnSignal } from './args.mjs';

const port = readPort(43108);

const body = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>疑似デスクトップ教材</title>
  <style>body { max-width: 640px; margin: 32px auto; padding: 0 20px; font-family: sans-serif; }</style>
</head>
<body>
  <h1>疑似デスクトップ教材</h1>
  <p>別ウィンドウで操作する教材を表す確認画面です。</p>
  <button id="run" type="button">操作する</button>
  <p id="result">未操作</p>
  <script>
    document.querySelector('#run').addEventListener('click', () => {
      document.querySelector('#result').textContent = '操作結果を確認しました。';
    });
  </script>
</body>
</html>`;

const server = http.createServer((request, response) => {
  if (request.url === '/health') {
    sendJson(response, 200, { status: 'ready' });
    return;
  }
  response.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'content-length': Buffer.byteLength(body)
  });
  response.end(body);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`疑似デスクトップ教材を http://127.0.0.1:${port}/ で起動しました。`);
});
stopOnSignal(server);
