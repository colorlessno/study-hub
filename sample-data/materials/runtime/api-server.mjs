import http from 'node:http';
import { readOption, readPort, sendJson, stopOnSignal } from './args.mjs';

const port = readPort(43105);
const dependencyUrl = readOption('dependency-url');
const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'POST, OPTIONS'
};

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 32 * 1024) {
      throw new Error('入力が大きすぎます。');
    }
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders);
    response.end();
    return;
  }

  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, { status: 'ready' }, corsHeaders);
    return;
  }

  if (request.method !== 'POST' || request.url !== '/run') {
    sendJson(response, 404, { error: 'not_found' }, corsHeaders);
    return;
  }

  try {
    const input = await readBody(request);
    let dependency = null;
    if (dependencyUrl) {
      const dependencyResponse = await fetch(dependencyUrl);
      dependency = await dependencyResponse.json();
    }
    sendJson(response, 200, {
      message: '疑似APIを実行しました。',
      received: input,
      dependency
    }, corsHeaders);
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : '処理に失敗しました。'
    }, corsHeaders);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`疑似APIを http://127.0.0.1:${port}/ で起動しました。`);
});
stopOnSignal(server);
