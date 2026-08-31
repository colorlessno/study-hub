import http from 'node:http'

let dependencyOk = true
const port = Number(process.env.PORT ?? '8080')
const host = process.env.HOST ?? '127.0.0.1'

function send(res, status, body) {
  res.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(body))
}

http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { status: 'ok' })
  if (req.method === 'GET' && req.url === '/ready') {
    return send(res, dependencyOk ? 200 : 503, {
      status: dependencyOk ? 'ready' : 'not_ready',
      dependencies: { sample_dependency: dependencyOk ? 'ok' : 'failed' },
    })
  }
  if (req.method === 'POST' && req.url === '/toggle-dependency') {
    dependencyOk = !dependencyOk
    return send(res, 200, { dependency_ok: dependencyOk })
  }
  return send(res, 404, { error_code: 'not_found' })
}).listen(port, host, () => console.log(`health api listening on ${host}:${port}`))
