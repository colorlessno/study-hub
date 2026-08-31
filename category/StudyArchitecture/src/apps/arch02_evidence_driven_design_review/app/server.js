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
const reviewStatuses = new Set(['未対応', '対応済み', 'リスク受容']);

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
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evidence_type TEXT NOT NULL,
      finding TEXT NOT NULL,
      impact TEXT NOT NULL,
      fix_candidate TEXT NOT NULL,
      status TEXT NOT NULL,
      residual_risk TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS request_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trace_id TEXT NOT NULL,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      status_code INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return database;
}

function logRequest(database, traceId, method, pathname, statusCode) {
  database.prepare(`
    INSERT INTO request_logs (trace_id, method, path, status_code, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(traceId, method, pathname, statusCode, new Date().toISOString());
}

function serveStatic(response, pathname) {
  const fileName = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = path.resolve(publicDirectory, fileName);
  if (!filePath.startsWith(`${publicDirectory}${path.sep}`) || !existsSync(filePath)) return false;
  response.writeHead(200, {
    'Content-Type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream'
  });
  createReadStream(filePath).pipe(response);
  return true;
}

function taskRows(database) {
  return database.prepare(
    'SELECT id, title, created_at AS createdAt FROM tasks ORDER BY id DESC'
  ).all();
}

function reviewRows(database) {
  return database.prepare(`
    SELECT id, evidence_type AS evidenceType, finding, impact,
           fix_candidate AS fixCandidate, status, residual_risk AS residualRisk,
           created_at AS createdAt
    FROM reviews ORDER BY id DESC
  `).all();
}

export function createReviewServer(options = {}) {
  const databasePath = options.databasePath
    ?? process.env.ARCH02_DB_PATH
    ?? path.join(tmpdir(), 'studyhub-arch02.sqlite');
  const database = initializeDatabase(databasePath);

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const traceId = request.headers['x-trace-id']?.toString()
      ?? `arch02-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const method = request.method ?? 'UNKNOWN';

    try {
      if (method === 'GET' && url.pathname === '/health') {
        logRequest(database, traceId, method, url.pathname, 200);
        return sendJson(response, 200, { status: 'ok', traceId });
      }
      if (method === 'GET' && url.pathname === '/ready') {
        database.prepare('SELECT 1 AS ready').get();
        logRequest(database, traceId, method, url.pathname, 200);
        return sendJson(response, 200, { status: 'ready', database: 'sqlite', traceId });
      }
      if (method === 'GET' && url.pathname === '/api/review-scope') {
        return sendJson(response, 200, {
          target: 'arch02内のタスク登録システム',
          scope: ['ブラウザ画面', 'POST /api/tasks', 'SQLite tasksテーブル', '実行ログ', 'health/ready'],
          expected: {
            createTaskStatus: 201,
            persistence: 'SQLiteへ保存',
            evidence: ['画面', 'API応答', 'DB一覧', 'ログ', 'ヘルスチェック']
          },
          knownFixtureDifference: '教材上のレビュー対象として、タスク登録APIは202を返す'
        });
      }
      if (method === 'GET' && url.pathname === '/api/tasks') {
        const tasks = taskRows(database);
        logRequest(database, traceId, method, url.pathname, 200);
        return sendJson(response, 200, { traceId, tasks });
      }
      if (method === 'POST' && url.pathname === '/api/tasks') {
        const body = await readJson(request);
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        if (!title) {
          logRequest(database, traceId, method, url.pathname, 400);
          return sendJson(response, 400, { error: 'TITLE_REQUIRED', traceId });
        }
        const createdAt = new Date().toISOString();
        const result = database.prepare(
          'INSERT INTO tasks (title, created_at) VALUES (?, ?)'
        ).run(title, createdAt);
        const task = { id: Number(result.lastInsertRowid), title, createdAt };
        logRequest(database, traceId, method, url.pathname, 202);
        return sendJson(response, 202, { traceId, task });
      }
      if (method === 'GET' && url.pathname === '/api/logs') {
        const logs = database.prepare(`
          SELECT trace_id AS traceId, method, path, status_code AS statusCode,
                 created_at AS createdAt
          FROM request_logs ORDER BY id DESC LIMIT 50
        `).all();
        return sendJson(response, 200, { logs });
      }
      if (method === 'GET' && url.pathname === '/api/reviews') {
        return sendJson(response, 200, { reviews: reviewRows(database) });
      }
      if (method === 'POST' && url.pathname === '/api/reviews') {
        const body = await readJson(request);
        const required = ['evidenceType', 'finding', 'impact', 'fixCandidate', 'status', 'residualRisk'];
        if (required.some((key) => typeof body[key] !== 'string' || body[key].trim() === '')) {
          logRequest(database, traceId, method, url.pathname, 400);
          return sendJson(response, 400, { error: 'REVIEW_FIELDS_REQUIRED', traceId });
        }
        if (!reviewStatuses.has(body.status.trim())) {
          logRequest(database, traceId, method, url.pathname, 400);
          return sendJson(response, 400, { error: 'REVIEW_STATUS_INVALID', traceId });
        }
        const createdAt = new Date().toISOString();
        const result = database.prepare(`
          INSERT INTO reviews (
            evidence_type, finding, impact, fix_candidate, status, residual_risk, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          body.evidenceType.trim(),
          body.finding.trim(),
          body.impact.trim(),
          body.fixCandidate.trim(),
          body.status.trim(),
          body.residualRisk.trim(),
          createdAt
        );
        logRequest(database, traceId, method, url.pathname, 201);
        return sendJson(response, 201, {
          traceId,
          review: { id: Number(result.lastInsertRowid), ...body, createdAt }
        });
      }
      if (method === 'GET' && serveStatic(response, url.pathname)) return;
      logRequest(database, traceId, method, url.pathname, 404);
      return sendJson(response, 404, { error: 'NOT_FOUND', traceId });
    } catch (error) {
      logRequest(database, traceId, method, url.pathname, 500);
      return sendJson(response, 500, {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : String(error),
        traceId
      });
    }
  });

  server.on('close', () => database.close());
  return { server, databasePath };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 43702);
  const { server, databasePath } = createReviewServer();
  server.listen(port, '127.0.0.1', () => {
    console.log(`[arch02] http://127.0.0.1:${port}/`);
    console.log(`[arch02] SQLite: ${databasePath}`);
  });
}
