const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const appDirectory = __dirname;
const port = Number(process.env.PORT || 43345);
const initialRecord = Object.freeze({ id: 1, name: '元のデータ', version: 1 });
let record = { ...initialRecord };

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16 * 1024) throw new Error('入力が大きすぎます。');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function serveFile(response, relativePath, contentType) {
  const body = await readFile(path.join(appDirectory, relativePath));
  response.writeHead(200, { 'Content-Type': contentType });
  response.end(body);
}

function createAppServer() {
  return createServer(async (request, response) => {
    try {
      if (request.method === 'GET' && request.url === '/') {
        return await serveFile(response, 'index.html', 'text/html; charset=utf-8');
      }
      if (request.method === 'GET' && request.url === '/src/main.js') {
        return await serveFile(response, 'src/main.js', 'text/javascript; charset=utf-8');
      }
      if (request.method === 'GET' && request.url === '/api/record') {
        return sendJson(response, 200, record);
      }
      if (request.method === 'POST' && request.url === '/api/reset') {
        record = { ...initialRecord };
        return sendJson(response, 200, record);
      }
      if (request.method === 'PUT' && request.url === '/api/record') {
        const input = await readJson(request);
        if (!Number.isInteger(input.version) || typeof input.name !== 'string' || !input.name.trim()) {
          return sendJson(response, 400, { code: 'INVALID_INPUT', message: 'nameとversionを正しく指定してください。' });
        }
        if (input.version !== record.version) {
          return sendJson(response, 409, {
            code: 'VERSION_CONFLICT',
            message: '読込後に別の利用者が更新しました。最新版を読み直してください。',
            current: record,
          });
        }
        record = { id: record.id, name: input.name.trim(), version: record.version + 1 };
        return sendJson(response, 200, record);
      }
      sendJson(response, 404, { code: 'NOT_FOUND', message: '指定したURLはありません。' });
    } catch (error) {
      sendJson(response, 400, { code: 'INVALID_REQUEST', message: error instanceof Error ? error.message : '要求を処理できません。' });
    }
  });
}

if (require.main === module) {
  createAppServer().listen(port, '127.0.0.1', () => {
    console.log(`web45 server listening at http://127.0.0.1:${port}`);
  });
}

module.exports = { createAppServer };
