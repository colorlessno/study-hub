const http = require('http');
const port = Number(process.env.PORT || 3035);

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function sendError(res, status, code, message) {
  send(res, status, { error: { code, message } });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (error) {
        reject(Object.assign(error, { code: 'INVALID_JSON' }));
      }
    });
    req.on('error', reject);
  });
}

async function handleRequest(req, res, items) {
  if (req.method === 'GET' && req.url === '/') return send(res, 200, {
    theme: 'web35',
    description: 'HTTP状態番号を比較するAPI',
    endpoints: ['/items', '/private', '/admin', '/items/999', '/error'],
  });
  if (req.method === 'GET' && req.url === '/items') return send(res, 200, { items });
  if (req.method === 'POST' && req.url === '/items') {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      return sendError(res, 400, error.code === 'INVALID_JSON' ? 'INVALID_JSON' : 'VALIDATION_ERROR', 'invalid JSON body');
    }
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return sendError(res, 400, 'VALIDATION_ERROR', 'name is required');
    if (items.some((item) => item.name === name)) return sendError(res, 409, 'CONFLICT', 'item name already exists');
    const item = { id: Math.max(0, ...items.map((value) => value.id)) + 1, name };
    items.push(item);
    return send(res, 201, item);
  }
  if (req.url === '/private') return sendError(res, 401, 'UNAUTHORIZED', 'login required');
  if (req.url === '/admin') return sendError(res, 403, 'FORBIDDEN', 'permission required');
  if (req.url === '/items/999') return sendError(res, 404, 'NOT_FOUND', 'item not found');
  if (req.url === '/error') throw new Error('intentional internal failure for web35');
  return sendError(res, 404, 'NOT_FOUND', 'route not found');
}

function createServer({ initialItems = [{ id: 1, name: 'one' }] } = {}) {
  const items = initialItems.map((item) => ({ ...item }));
  return http.createServer((req, res) => {
    handleRequest(req, res, items).catch(() => {
      if (!res.headersSent) sendError(res, 500, 'INTERNAL_ERROR', 'unexpected error');
    });
  });
}

if (require.main === module) {
  createServer().listen(port, '127.0.0.1', () => console.log(`web35 http://127.0.0.1:${port}`));
}

module.exports = { createServer };
