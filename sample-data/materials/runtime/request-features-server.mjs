import http from 'node:http';

const portIndex = process.argv.indexOf('--port');
const port = Number(process.argv[portIndex + 1]);
let temporaryCount = 0;

function send(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, { 'content-type': 'application/json', ...headers });
  response.end(JSON.stringify(body));
}

http.createServer((request, response) => {
  if (request.url === '/health') return send(response, 200, { ok: true });
  if (request.url === '/login') {
    return send(response, 200, { ok: true }, {
      'set-cookie': 'sid=studyhub-session; HttpOnly; SameSite=Lax; Path=/'
    });
  }
  if (request.url === '/me') {
    return request.headers.cookie === 'sid=studyhub-session'
      ? send(response, 200, { user: 'studyhub' })
      : send(response, 401, { error: 'not_logged_in' });
  }
  if (request.url === '/logout') {
    return send(response, 200, { ok: true }, {
      'set-cookie': 'sid=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/'
    });
  }
  if (request.url === '/slow') {
    return setTimeout(() => send(response, 200, { ok: true }), 200);
  }
  if (request.url === '/temporary') {
    temporaryCount += 1;
    return temporaryCount < 3
      ? send(response, 503, { attempt: temporaryCount, retryable: true })
      : send(response, 200, { attempt: temporaryCount, recovered: true });
  }
  return send(response, 404, { error: 'not_found' });
}).listen(port, '127.0.0.1');
