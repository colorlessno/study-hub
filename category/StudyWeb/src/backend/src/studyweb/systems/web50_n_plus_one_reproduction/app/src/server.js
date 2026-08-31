import http from 'node:http';
import { performance } from 'node:perf_hooks';
import { PrismaClient } from '@prisma/client';
import { fetchUsersWithTasks } from './queryComparison.js';

const port = Number(process.env.PORT || 3050);
const prisma = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });
let activeQueryLog = null;
let requestQueue = Promise.resolve();

prisma.$on('query', (event) => {
  if (activeQueryLog) {
    activeQueryLog.push({ sql: event.query, parameters: event.params, durationMs: event.duration });
  }
});

async function seedParentData(parentCount) {
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  await prisma.user.createMany({
    data: Array.from({ length: parentCount }, (_, index) => ({ id: index + 1, name: `user-${index + 1}` }))
  });
  if (parentCount >= 1) {
    const tasks = [
      { id: 1, userId: 1, title: 'task-1' },
      { id: 2, userId: 1, title: 'task-2' }
    ];
    if (parentCount >= 2) tasks.push({ id: 3, userId: 2, title: 'task-3' });
    await prisma.task.createMany({ data: tasks });
  }
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function handleRequest(req, res) {
  const requestUrl = new URL(req.url, 'http://localhost');
  if (req.method !== 'GET' || requestUrl.pathname !== '/') {
    return send(res, 404, { error: 'not_found' });
  }

  const mode = requestUrl.searchParams.get('mode') || 'n_plus_one';
  const parentCount = Number(requestUrl.searchParams.get('count') || '3');
  if (!['n_plus_one', 'optimized'].includes(mode)) {
    return send(res, 400, { error: 'unknown_mode' });
  }
  if (!Number.isInteger(parentCount) || parentCount < 1 || parentCount > 20) {
    return send(res, 400, { error: 'count_must_be_between_1_and_20' });
  }

  await seedParentData(parentCount);
  activeQueryLog = [];
  const startedAt = performance.now();
  try {
    const result = await fetchUsersWithTasks(prisma, mode);
    const durationMs = Number((performance.now() - startedAt).toFixed(3));
    const queryLog = activeQueryLog;
    return send(res, 200, {
      mode,
      parentCount,
      queries: queryLog.length,
      durationMs,
      queryLog,
      result
    });
  } finally {
    activeQueryLog = null;
  }
}

const server = http.createServer((req, res) => {
  requestQueue = requestQueue
    .then(() => handleRequest(req, res))
    .catch((error) => {
      console.error('[web50] request failed', error);
      if (!res.headersSent) send(res, 500, { error: 'internal_error' });
    });
});

server.listen(port, '0.0.0.0', () => console.log(`web50 http://127.0.0.1:${port}/?mode=n_plus_one&count=3`));

async function shutdown() {
  server.close();
  await prisma.$disconnect();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
