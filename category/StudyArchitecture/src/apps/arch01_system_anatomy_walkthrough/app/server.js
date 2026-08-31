import { createReadStream, existsSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.join(appDirectory, 'public');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
};

function sendJson(response, statusCode, value) {
  const body = JSON.stringify(value, null, 2);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  response.end(body);
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function initializeDatabase(databasePath) {
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS request_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trace_id TEXT NOT NULL,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      status_code INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return database;
}

function recordLog(database, { traceId, method, pathname, statusCode, message }) {
  database.prepare(`
    INSERT INTO request_logs (trace_id, method, path, status_code, message, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(traceId, method, pathname, statusCode, message, new Date().toISOString());
}

function serveStatic(response, pathname) {
  const fileName = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = path.resolve(publicDirectory, fileName);
  if (!filePath.startsWith(`${publicDirectory}${path.sep}`) || !existsSync(filePath)) return false;
  const extension = path.extname(filePath);
  response.writeHead(200, { 'Content-Type': contentTypes[extension] ?? 'application/octet-stream' });
  createReadStream(filePath).pipe(response);
  return true;
}

export function createArchitectureServer(options = {}) {
  const databasePath = options.databasePath
    ?? process.env.ARCH01_DB_PATH
    ?? path.join(tmpdir(), 'studyhub-arch01.sqlite');
  const database = initializeDatabase(databasePath);
  let failureMode = false;

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const traceId = request.headers['x-trace-id']?.toString()
      ?? `arch01-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        recordLog(database, {
          traceId,
          method: 'GET',
          pathname: url.pathname,
          statusCode: 200,
          message: 'HTTPサーバーは稼働中'
        });
        return sendJson(response, 200, { status: 'ok', component: 'http-server', traceId });
      }

      if (request.method === 'GET' && url.pathname === '/ready') {
        database.prepare('SELECT 1 AS ready').get();
        const statusCode = failureMode ? 503 : 200;
        recordLog(database, {
          traceId,
          method: 'GET',
          pathname: url.pathname,
          statusCode,
          message: failureMode ? '業務サービスを停止中' : 'APIとSQLiteを利用可能'
        });
        return sendJson(response, statusCode, {
          status: failureMode ? 'unavailable' : 'ready',
          database: 'sqlite',
          traceId
        });
      }

      if (request.method === 'GET' && url.pathname === '/api/system-map') {
        return sendJson(response, 200, {
          components: ['利用者', 'ブラウザ画面', 'HTTP API', '業務処理', 'SQLite', 'リクエストログ'],
          externalBoundaries: ['ブラウザとHTTPサーバーの境界'],
          representativeFlow: ['入力', 'POST /api/orders', '入力検証', 'SQLiteへ保存', 'ログ記録', 'JSON応答']
        });
      }

      if (request.method === 'GET' && url.pathname === '/api/orders') {
        const orders = database.prepare(`
          SELECT id, title, created_at AS createdAt FROM orders ORDER BY id DESC
        `).all();
        recordLog(database, {
          traceId,
          method: 'GET',
          pathname: url.pathname,
          statusCode: 200,
          message: `${orders.length}件を取得`
        });
        return sendJson(response, 200, { traceId, orders });
      }

      if (request.method === 'POST' && url.pathname === '/api/orders') {
        if (failureMode) {
          recordLog(database, {
            traceId,
            method: 'POST',
            pathname: url.pathname,
            statusCode: 503,
            message: '障害モードのため保存を拒否'
          });
          return sendJson(response, 503, { error: 'SERVICE_UNAVAILABLE', traceId });
        }
        const body = await readJson(request);
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        if (!title) {
          recordLog(database, {
            traceId,
            method: 'POST',
            pathname: url.pathname,
            statusCode: 400,
            message: 'titleが空'
          });
          return sendJson(response, 400, { error: 'TITLE_REQUIRED', traceId });
        }
        const createdAt = new Date().toISOString();
        const result = database.prepare(
          'INSERT INTO orders (title, created_at) VALUES (?, ?)'
        ).run(title, createdAt);
        const order = { id: Number(result.lastInsertRowid), title, createdAt };
        recordLog(database, {
          traceId,
          method: 'POST',
          pathname: url.pathname,
          statusCode: 201,
          message: `注文${order.id}をSQLiteへ保存`
        });
        return sendJson(response, 201, { traceId, order });
      }

      if (request.method === 'POST' && url.pathname === '/api/failure-mode') {
        const body = await readJson(request);
        failureMode = body.enabled === true;
        recordLog(database, {
          traceId,
          method: 'POST',
          pathname: url.pathname,
          statusCode: 200,
          message: failureMode ? '障害モードを開始' : '障害モードから復旧'
        });
        return sendJson(response, 200, { failureMode, traceId });
      }

      if (request.method === 'GET' && url.pathname === '/api/logs') {
        const logs = database.prepare(`
          SELECT trace_id AS traceId, method, path, status_code AS statusCode,
                 message, created_at AS createdAt
          FROM request_logs ORDER BY id DESC LIMIT 50
        `).all();
        return sendJson(response, 200, { logs });
      }

      if (request.method === 'GET' && serveStatic(response, url.pathname)) return;
      recordLog(database, {
        traceId,
        method: request.method ?? 'UNKNOWN',
        pathname: url.pathname,
        statusCode: 404,
        message: '該当する入口なし'
      });
      return sendJson(response, 404, { error: 'NOT_FOUND', traceId });
    } catch (error) {
      recordLog(database, {
        traceId,
        method: request.method ?? 'UNKNOWN',
        pathname: url.pathname,
        statusCode: 500,
        message: error instanceof Error ? error.message : String(error)
      });
      return sendJson(response, 500, { error: 'INTERNAL_ERROR', traceId });
    }
  });

  server.on('close', () => database.close());
  return { server, databasePath };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 43701);
  const { server, databasePath } = createArchitectureServer();
  server.listen(port, '127.0.0.1', () => {
    console.log(`[arch01] http://127.0.0.1:${port}/`);
    console.log(`[arch01] SQLite: ${databasePath}`);
  });
}
