import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const appDirectory = fileURLToPath(new URL('../app/', import.meta.url))

function startApp(mode, port) {
  let output = ''
  const child = spawn(process.execPath, ['server.js'], {
    cwd: appDirectory,
    env: { ...process.env, APP_MODE: mode, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (chunk) => { output += chunk })
  child.stderr.on('data', (chunk) => { output += chunk })
  return { child, output: () => output }
}

async function waitForResponse(url) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      return await fetch(url)
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
  throw new Error('server did not become reachable')
}

async function waitForExit(child) {
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('process did not exit'))
    }, 3000)
    child.once('exit', (code) => {
      clearTimeout(timer)
      resolve(code)
    })
  })
}

test('missing environment scenario exits with a classifiable log', async () => {
  const app = startApp('missing-env', 19088)
  assert.equal(await waitForExit(app.child), 1)
  const entry = JSON.parse(app.output().trim())
  assert.equal(entry.action, 'startup_failed')
  assert.equal(entry.error_code, 'missing_required_value')
})

test('runtime error scenario returns a traceable 500 without query leakage', async (context) => {
  const app = startApp('runtime-error', 19089)
  context.after(() => app.child.kill())
  const secretLikeValue = 'do-not-write-this-value-to-logs'
  const response = await waitForResponse(`http://127.0.0.1:19089/work?token=${secretLikeValue}`)
  assert.equal(response.status, 500)
  assert.equal(response.headers.get('x-request-id')?.length > 0, true)
  assert.equal((await response.json()).error_code, 'runtime_error')
  assert.equal(app.output().includes('"action":"request_failed"'), true)
  assert.equal(app.output().includes(secretLikeValue), false)
})

test('normal scenario returns a structured success signal', async (context) => {
  const app = startApp('ok', 19090)
  context.after(() => app.child.kill())
  const response = await waitForResponse('http://127.0.0.1:19090/health')
  assert.equal(response.status, 200)
  assert.equal((await response.json()).status, 'ok')
  assert.equal(app.output().includes('"action":"request_completed"'), true)
})
