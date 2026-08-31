import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

let baseUrl = process.env.API_BASE_URL
let localServer

before(async () => {
  if (baseUrl) return

  const { createApiServer } = await import('../app/server.js')
  localServer = createApiServer()
  await new Promise((resolve, reject) => {
    localServer.once('error', reject)
    localServer.listen(0, '127.0.0.1', resolve)
  })
  const address = localServer.address()
  assert.equal(typeof address, 'object')
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  if (!localServer) return
  await new Promise((resolve, reject) => {
    localServer.close((error) => (error ? reject(error) : resolve()))
  })
})

async function retry(path) {
  for (let i = 0; i < 20; i += 1) {
    try {
      return await fetch(`${baseUrl}${path}`)
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }
  throw new Error('api not reachable')
}

test('health smoke', async () => {
  const res = await retry('/health')
  assert.equal(res.status, 200)
  assert.equal((await res.json()).status, 'ok')
})

test('create item and validate errors', async () => {
  const created = await fetch(`${baseUrl}/items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'sample' }),
  })
  assert.equal(created.status, 201)
  assert.equal((await created.json()).id, 'item-1')

  const invalid = await fetch(`${baseUrl}/items`, { method: 'POST', body: '{}' })
  assert.equal(invalid.status, 400)
  assert.equal((await invalid.json()).error_code, 'name_required')

  const malformed = await fetch(`${baseUrl}/items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"name":',
  })
  assert.equal(malformed.status, 400)
  assert.equal((await malformed.json()).error_code, 'invalid_json')

  const oversized = await fetch(`${baseUrl}/items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'x'.repeat(64 * 1024) }),
  })
  assert.equal(oversized.status, 413)
  assert.equal((await oversized.json()).error_code, 'body_too_large')

  const healthAfterError = await fetch(`${baseUrl}/health`)
  assert.equal(healthAfterError.status, 200)

  const missing = await fetch(`${baseUrl}/missing`)
  assert.equal(missing.status, 404)
})
