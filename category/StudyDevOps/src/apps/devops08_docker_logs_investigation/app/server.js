import crypto from 'node:crypto'
import http from 'node:http'

const mode = process.env.APP_MODE ?? 'ok'
const port = Number(process.env.PORT ?? '8080')
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/

function log(entry) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...entry }))
}

function requestIdFor(value) {
  return typeof value === 'string' && REQUEST_ID_PATTERN.test(value) ? value : crypto.randomUUID()
}

if (mode === 'missing-env' && !process.env.REQUIRED_VALUE) {
  log({ level: 'error', action: 'startup_failed', error_code: 'missing_required_value' })
  process.exit(1)
}

http.createServer((req, res) => {
  const requestId = requestIdFor(req.headers['x-request-id'])
  const path = new URL(req.url ?? '/', 'http://localhost').pathname
  res.setHeader('X-Request-Id', requestId)
  res.setHeader('Cache-Control', 'no-store')
  if (mode === 'runtime-error') {
    log({ level: 'error', action: 'request_failed', error_code: 'runtime_error', request_id: requestId, path, status: 500 })
    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error_code: 'runtime_error' }))
    return
  }
  log({ level: 'info', action: 'request_completed', request_id: requestId, path, status: 200 })
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify({ status: 'ok', mode }))
}).listen(port, () => log({ level: 'info', action: 'server_started', mode, port }))
