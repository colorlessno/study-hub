import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const appDirectory = fileURLToPath(new URL('../app/', import.meta.url))
const baseUrl = 'http://127.0.0.1:19086'

async function waitFor(predicate, message) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(message)
}

test('normal and failed requests are traceable without leaking query values', async (context) => {
  let output = ''
  const child = spawn(process.execPath, ['server.js'], {
    cwd: appDirectory,
    env: { ...process.env, PORT: '19086' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (chunk) => { output += chunk })
  child.stderr.on('data', (chunk) => { output += chunk })
  context.after(() => child.kill())

  await waitFor(async () => {
    try {
      return (await fetch(`${baseUrl}/health`)).status === 200
    } catch {
      return false
    }
  }, 'server did not become ready')

  const secretLikeValue = 'do-not-write-this-value-to-logs'
  const ok = await fetch(`${baseUrl}/ok?token=${secretLikeValue}`, {
    headers: { 'X-Request-Id': 'req-ok-01' },
  })
  assert.equal(ok.status, 200)
  assert.equal(ok.headers.get('x-request-id'), 'req-ok-01')

  const failed = await fetch(`${baseUrl}/fail`, {
    headers: { 'X-Request-Id': 'req-fail-01' },
  })
  assert.equal(failed.status, 500)
  assert.equal(failed.headers.get('x-request-id'), 'req-fail-01')

  const unsafeId = await fetch(`${baseUrl}/ok`, {
    headers: { 'X-Request-Id': 'person@example.com' },
  })
  assert.equal(unsafeId.status, 200)
  assert.notEqual(unsafeId.headers.get('x-request-id'), 'person@example.com')

  await waitFor(() => output.includes('"action":"request_failed"'), 'failed request log was not written')
  const entries = output.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
  assert.ok(entries.some((entry) => entry.request_id === 'req-ok-01' && entry.action === 'request_completed'))
  assert.ok(entries.some((entry) => entry.request_id === 'req-fail-01' && entry.action === 'request_failed'))
  assert.equal(output.includes(secretLikeValue), false)
  assert.equal(output.includes('person@example.com'), false)
})
