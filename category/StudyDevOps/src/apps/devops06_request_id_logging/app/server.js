import crypto from 'node:crypto'
import http from 'node:http'
import { log } from './logger.js'

const port = Number(process.env.PORT ?? '8080')
const host = process.env.HOST ?? '127.0.0.1'
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/

function requestIdFor(value) {
  return typeof value === 'string' && REQUEST_ID_PATTERN.test(value) ? value : crypto.randomUUID()
}

const server = http.createServer((req, res) => {
  const started = Date.now()
  const requestId = requestIdFor(req.headers['x-request-id'])
  const path = new URL(req.url ?? '/', 'http://localhost').pathname
  res.setHeader('X-Request-Id', requestId)
  res.setHeader('Cache-Control', 'no-store')
  log({ level: 'info', request_id: requestId, action: 'request_started', method: req.method, path })
  try {
    if (path === '/fail') throw new Error('sample failure')
    const body = path === '/health' ? { status: 'ok' } : { ok: true }
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(body))
    log({ level: 'info', request_id: requestId, action: 'request_completed', status: 200, duration_ms: Date.now() - started })
  } catch (error) {
    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error_code: 'sample_failure' }))
    log({ level: 'error', request_id: requestId, action: 'request_failed', status: 500, message: error.message, duration_ms: Date.now() - started })
  }
})

server.listen(port, host, () => log({ level: 'info', action: 'server_started', host, port }))
