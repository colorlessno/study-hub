import http from 'node:http';
import { readPort, sendJson, stopOnSignal } from './args.mjs';

const port = readPort(43106);

const server = http.createServer((request, response) => {
  if (request.url === '/health') {
    sendJson(response, 200, { status: 'ready' });
    return;
  }
  if (request.url === '/value') {
    sendJson(response, 200, { value: '疑似依存サービスの応答' });
    return;
  }
  sendJson(response, 404, { error: 'not_found' });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`疑似依存サービスを http://127.0.0.1:${port}/ で起動しました。`);
});
stopOnSignal(server);
