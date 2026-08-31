import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const appDirectory = fileURLToPath(new URL('../app/', import.meta.url))
const baseUrl = 'http://127.0.0.1:19087'

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      if ((await fetch(`${baseUrl}/health`)).status === 200) return
    } catch {
      // The process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('server did not become ready')
}

test('health stays alive while readiness follows dependency state', async (context) => {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: appDirectory,
    env: { ...process.env, PORT: '19087' },
    stdio: 'ignore',
  })
  context.after(() => child.kill())
  await waitForServer()

  const health = await fetch(`${baseUrl}/health`)
  assert.equal(health.status, 200)
  assert.equal((await health.json()).status, 'ok')

  const ready = await fetch(`${baseUrl}/ready`)
  assert.equal(ready.status, 200)
  assert.equal((await ready.json()).status, 'ready')

  const toggled = await fetch(`${baseUrl}/toggle-dependency`, { method: 'POST' })
  assert.equal(toggled.status, 200)
  assert.equal((await toggled.json()).dependency_ok, false)

  const notReady = await fetch(`${baseUrl}/ready`)
  assert.equal(notReady.status, 503)
  assert.equal((await notReady.json()).status, 'not_ready')

  const stillAlive = await fetch(`${baseUrl}/health`)
  assert.equal(stillAlive.status, 200)

  await fetch(`${baseUrl}/toggle-dependency`, { method: 'POST' })
  assert.equal((await (await fetch(`${baseUrl}/ready`)).json()).status, 'ready')
})
