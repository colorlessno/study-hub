const http = require('http');

const items = [{ id: 1, name: 'sample item' }];
const maxBodyBytes = 128;

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    let tooLarge = false;
    req.on('data', (chunk) => {
      data += chunk;
      if (Buffer.byteLength(data, 'utf8') > maxBodyBytes) tooLarge = true;
    });
    req.on('end', () => resolve({ data, tooLarge }));
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    return sendJson(res, 200, { message: 'base10 sample API', maxBodyBytes });
  }

  if (req.method === 'GET' && req.url === '/health') {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === 'GET' && req.url === '/items') {
    return sendJson(res, 200, { items });
  }

  if (req.method === 'POST' && req.url === '/items') {
    const { data: raw, tooLarge } = await readBody(req);
    if (tooLarge) {
      return sendJson(res, 413, { error: 'payload_too_large', maxBodyBytes });
    }
    if (!req.headers['content-type']?.toLowerCase().includes('application/json')) {
      return sendJson(res, 415, { error: 'application_json_required' });
    }
    let body;
    try {
      body = JSON.parse(raw || '{}');
    } catch {
      return sendJson(res, 400, { error: 'invalid_json' });
    }
    if (!body.name) {
      return sendJson(res, 400, { error: 'name_required' });
    }
    const item = { id: items.length + 1, name: body.name };
    items.push(item);
    return sendJson(res, 201, { item });
  }

  if (req.url === '/health' || req.url === '/items') {
    const allowedMethods = req.url === '/health' ? 'GET' : 'GET, POST';
    return sendJson(res, 405, { error: 'method_not_allowed' }, { Allow: allowedMethods });
  }

  if (req.method === 'GET' && req.url === '/private') {
    if (req.headers.authorization !== 'Bearer studybase') {
      return sendJson(res, 401, { error: 'unauthorized' });
    }
    return sendJson(res, 200, { message: 'private ok' });
  }

  if (req.method === 'GET' && req.url === '/forbidden') {
    return sendJson(res, 403, { error: 'forbidden' });
  }

  if (req.method === 'GET' && req.url === '/error') {
    return sendJson(res, 500, { error: 'server_error_sample' });
  }

  if (req.method === 'GET' && req.url === '/upstream-error') {
    return sendJson(res, 502, { error: 'upstream_service_unavailable' });
  }

  return sendJson(res, 404, { error: 'not_found' });
});

const port = Number(process.env.PORT || 3010);
const host = process.env.HOST || '127.0.0.1';
server.listen(port, host, () => {
  console.log(`sample api listening on http://${host}:${port}`);
});
