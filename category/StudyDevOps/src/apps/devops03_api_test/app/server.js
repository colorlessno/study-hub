import http from 'node:http'
import { pathToFileURL } from 'node:url'

const MAX_BODY_BYTES = 64 * 1024

function send(res, status, body) {
  res.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(body))
}

export function createApiServer() {
  const items = []

  return http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { status: 'ok' })
    if (req.method === 'GET' && req.url === '/items') return send(res, 200, { items })
    if (req.method === 'POST' && req.url === '/items') {
      const chunks = []
      let bodyBytes = 0

      req.on('data', (chunk) => {
        bodyBytes += chunk.length
        if (bodyBytes <= MAX_BODY_BYTES) chunks.push(chunk)
      })
      req.on('end', () => {
        if (bodyBytes > MAX_BODY_BYTES) {
          return send(res, 413, { error_code: 'body_too_large' })
        }

        let body
        try {
          const raw = Buffer.concat(chunks).toString('utf8')
          body = raw ? JSON.parse(raw) : {}
        } catch {
          return send(res, 400, { error_code: 'invalid_json' })
        }

        const name = typeof body?.name === 'string' ? body.name.trim() : ''
        if (!name) return send(res, 400, { error_code: 'name_required' })

        const item = { id: `item-${items.length + 1}`, name }
        items.push(item)
        return send(res, 201, item)
      })
      return
    }
    return send(res, 404, { error_code: 'not_found' })
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? '8080')
  const server = createApiServer()
  server.listen(port, () => console.log(`api listening on ${port}`))
}
