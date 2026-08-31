import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const studyAwsRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const systemsRoot = path.join(studyAwsRoot, 'src', 'backend', 'src', 'studyaws', 'systems')
const supportedTopics = Array.from({ length: 10 }, (_, index) => `aws${String(index + 1).padStart(2, '0')}`)
const requestedTopics = process.argv.slice(2)

for (const topic of requestedTopics) {
  if (!supportedTopics.includes(topic)) {
    throw new Error(`Unknown topic: ${topic}. Choose ${supportedTopics.join(', ')}.`)
  }
}

const shouldValidate = (topic) => requestedTopics.length === 0 || requestedTopics.includes(topic)
const validatedTopics = []

function topicDirectory(topic, name) {
  return path.join(systemsRoot, `${topic}_${name}`)
}

function runNode(args, options = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: options.cwd || studyAwsRoot,
    encoding: 'utf8',
    env: { ...process.env, ...options.env },
    maxBuffer: 8 * 1024 * 1024,
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  if (!options.allowFailure && result.status !== 0) {
    throw new Error(`node ${args.join(' ')} failed\n${output}`)
  }
  return { status: result.status, output }
}

function checkFiles(cwd, ...files) {
  for (const file of files) runNode(['--check', file], { cwd })
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => resolve(address.port))
    })
  })
}

function request(port, requestPath, options = {}) {
  return new Promise((resolve, reject) => {
    const body = options.body ?? ''
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: requestPath,
      method: options.method || 'GET',
      headers: { ...options.headers, ...(body ? { 'content-length': Buffer.byteLength(body) } : {}) },
      timeout: 1000,
    }, (res) => {
      let responseBody = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => { responseBody += chunk })
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: responseBody }))
    })
    req.once('timeout', () => req.destroy(new Error('request_timeout')))
    req.once('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

async function waitUntilReady(port, deadline = Date.now() + 5000) {
  while (Date.now() < deadline) {
    try {
      await request(port, '/')
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }
  throw new Error(`server on port ${port} did not become ready within 5 seconds`)
}

async function withServer({ cwd, script, portVariable = 'PORT', env = {} }, verify) {
  const port = await getFreePort()
  const child = spawn(process.execPath, [script], {
    cwd,
    env: { ...process.env, ...env, [portVariable]: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', (chunk) => { output += chunk.toString('utf8') })
  child.stderr.on('data', (chunk) => { output += chunk.toString('utf8') })
  try {
    await waitUntilReady(port)
    await verify(port, () => output)
  } finally {
    child.kill()
    await Promise.race([
      new Promise((resolve) => child.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ])
  }
}

function section(title) {
  console.log(`\n[StudyAWS] ${title}`)
}

if (shouldValidate('aws01')) {
  section('aws01 IAM allow and deny decisions')
  const cwd = topicDirectory('aws01', 'iam_basics')
  checkFiles(cwd, 'app/policy_check.js')
  const allowed = runNode(['app/policy_check.js', 'allow'], { cwd })
  const implicit = runNode(['app/policy_check.js', 'implicit-deny'], { cwd })
  const explicit = runNode(['app/policy_check.js', 'explicit-deny'], { cwd })
  const admin = runNode(['app/policy_check.js', 'admin-risk'], { cwd })
  assert.match(allowed.output, /"decision": "allow"/)
  assert.match(implicit.output, /"decision": "implicitDeny"/)
  assert.match(explicit.output, /"decision": "explicitDeny"/)
  assert.match(admin.output, /"policy": "admin"/)
  assert.match(admin.output, /"decision": "allow"/)
  assert.doesNotMatch(admin.output, /"policy": "app-role"/)
  validatedTopics.push('aws01')
}

if (shouldValidate('aws02')) {
  section('aws02 public and internal port models')
  const cwd = topicDirectory('aws02', 'security_group_port')
  checkFiles(cwd, 'web/server.js', 'api/server.js', 'db/server.js', 'scripts/check_host_port.js')
  await withServer({ cwd, script: 'web/server.js', portVariable: 'WEB_PORT' }, async (port) => {
    const response = await request(port, '/')
    assert.equal(response.status, 200)
    assert.equal(JSON.parse(response.body).service, 'web')
  })
  await withServer({ cwd, script: 'api/server.js', portVariable: 'API_PORT' }, async (port) => {
    const response = await request(port, '/')
    assert.equal(response.status, 200)
    assert.equal(JSON.parse(response.body).internalOnly, true)
  })
  await withServer({ cwd, script: 'db/server.js', portVariable: 'DB_PORT' }, async (port) => {
    const response = await request(port, '/')
    assert.equal(response.status, 200)
    assert.equal(JSON.parse(response.body).service, 'db')
    assert.equal(JSON.parse(response.body).internalOnly, true)
  })
  const apiSource = fs.readFileSync(path.join(cwd, 'api', 'server.js'), 'utf8')
  assert.match(apiSource, /DATABASE_URL/)
  assert.match(apiSource, /\/database/)
  validatedTopics.push('aws02')
}

if (shouldValidate('aws03')) {
  section('aws03 server health and not-found behavior')
  const cwd = topicDirectory('aws03', 'ec2_ssh')
  checkFiles(cwd, 'app/server.js', 'app/check_health.js', 'app/container_diagnostics.js')
  const diagnosticsSource = fs.readFileSync(path.join(cwd, 'app', 'container_diagnostics.js'), 'utf8')
  assert.match(diagnosticsSource, /\/proc\/1\/cmdline/)
  assert.match(diagnosticsSource, /process\.env\.PORT/)
  await withServer({ cwd, script: 'app/server.js' }, async (port) => {
    const health = await request(port, '/health')
    assert.equal(health.status, 200)
    assert.equal(JSON.parse(health.body).ok, true)
    assert.equal((await request(port, '/missing')).status, 404)
  })
  validatedTopics.push('aws03')
}

if (shouldValidate('aws04')) {
  section('aws04 real PostgreSQL connection and separated failures')
  const cwd = topicDirectory('aws04', 'rds_connection')
  checkFiles(cwd, 'app/db_check.js')
  assert.equal(fs.existsSync(path.join(cwd, 'Dockerfile')), true)
  assert.equal(fs.existsSync(path.join(cwd, 'docker-compose.yml')), true)
  const source = fs.readFileSync(path.join(cwd, 'app', 'db_check.js'), 'utf8')
  assert.match(source, /new Client/)
  assert.match(source, /client\.connect/)
  assert.match(source, /client\.query/)
  assert.match(source, /28P01/)
  assert.match(source, /ECONNREFUSED/)
  assert.doesNotMatch(source, /console\.log\([^\n]*DB_PASSWORD/)
  validatedTopics.push('aws04')
}

if (shouldValidate('aws05')) {
  section('aws05 local object storage and unsafe key rejection')
  const cwd = topicDirectory('aws05', 's3_file_storage')
  checkFiles(cwd, 'app/storage.js')
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'studyaws-storage-'))
  try {
    const env = { STUDYAWS_STORAGE_ROOT: temporaryRoot }
    const saved = JSON.parse(runNode(['app/storage.js', 'save-read'], { cwd, env }).output)
    assert.equal(saved.uploaded.key, 'docs/sample.txt')
    assert.equal(saved.downloaded.content, 'sample object body')
    assert.equal(saved.downloaded.metadata.contentType, 'text/plain; charset=utf-8')
    assert.equal(saved.downloaded.metadata.visibility, 'private')
    const listed = JSON.parse(runNode(['app/storage.js', 'list-objects'], { cwd, env }).output)
    assert.deepEqual(listed.keys, ['archive/sample-copy.txt', 'docs/sample.txt'])
    const deleted = JSON.parse(runNode(['app/storage.js', 'delete-object'], { cwd, env }).output)
    assert.equal(deleted.deleted.existed, true)
    assert.equal(deleted.deleted.existsAfterDelete, false)
    assert.equal(deleted.deleted.metadataExistsAfterDelete, false)
    assert.equal(deleted.remainingKeys.includes('docs/sample.txt'), false)
    const metadata = JSON.parse(runNode(['app/storage.js', 'metadata-access'], { cwd, env }).output)
    assert.equal(metadata.privateObject.metadata.visibility, 'private')
    assert.equal(metadata.publicComparison.metadata.visibility, 'public')
    assert.equal(metadata.recommendation, 'private bucketを既定にし、一時共有には期限付きURLを使う')
    const rejected = JSON.parse(runNode(['app/storage.js', 'reject-unsafe-key'], { cwd, env }).output)
    assert.equal(rejected.attempts.length, 3)
    assert.equal(rejected.attempts.every((attempt) => !attempt.allowed && attempt.reason === 'invalid_object_key'), true)
  } finally {
    if (path.basename(temporaryRoot).startsWith('studyaws-storage-')) {
      fs.rmSync(temporaryRoot, { recursive: true, force: true })
    }
  }
  validatedTopics.push('aws05')
}

if (shouldValidate('aws06')) {
  section('aws06 structured logs and request correlation')
  const cwd = topicDirectory('aws06', 'cloudwatch_logs')
  checkFiles(cwd, 'app/server.js')
  await withServer({ cwd, script: 'app/server.js' }, async (port, output) => {
    const ok = await request(port, '/health', { headers: { 'x-request-id': 'validation-normal' } })
    assert.equal(ok.status, 200)
    assert.equal(JSON.parse(ok.body).requestId, 'validation-normal')
    const error = await request(port, '/error', { headers: { 'x-request-id': 'validation-error' } })
    assert.equal(error.status, 500)
    assert.equal(error.headers['x-request-id'], 'validation-error')
    const sensitive = await request(port, '/sensitive?token=validation-secret&email=learner@example.com', {
      headers: { 'x-request-id': 'validation-sensitive' },
    })
    assert.equal(sensitive.status, 200)
    assert.equal(JSON.parse(sensitive.body).sensitiveValuesLogged, false)
    await new Promise((resolve) => setTimeout(resolve, 20))
    assert.match(output(), /"level":"info".*"requestId":"validation-normal".*"event":"request\.started"/)
    assert.match(output(), /"level":"info".*"requestId":"validation-normal".*"event":"request\.completed".*"statusCode":200/)
    assert.match(output(), /"level":"info".*"requestId":"validation-error".*"event":"request\.started"/)
    assert.match(output(), /"level":"error".*"requestId":"validation-error".*"event":"request\.failed".*"statusCode":500/)
    assert.doesNotMatch(output(), /validation-secret|learner@example\.com/)
  })
  validatedTopics.push('aws06')
}

if (shouldValidate('aws07')) {
  section('aws07 local Lambda invocation')
  const cwd = topicDirectory('aws07', 'lambda_local_api')
  checkFiles(cwd, 'src/handler.js', 'scripts/local_invoke.js')
  assert.equal(fs.existsSync(path.join(studyAwsRoot, 'src', 'infra', 'aws07_lambda_local_api', 'template.yaml')), true)
  const validResponse = JSON.parse(runNode(['scripts/local_invoke.js', 'valid-event'], { cwd }).output)
  assert.equal(validResponse.statusCode, 200)
  assert.equal(validResponse.body.message, 'hello StudyAWS')
  assert.equal(validResponse.body.requestId, 'local-001')
  assert.equal(validResponse.body.hasBody, true)
  assert.deepEqual(validResponse.body.runtime, {
    functionName: 'HelloFunction',
    memoryLimitInMB: '128',
    remainingTimeInMillis: 5000,
    greetingPrefix: 'hello',
  })
  const missingNameResponse = JSON.parse(runNode(['scripts/local_invoke.js', 'missing-name'], { cwd }).output)
  assert.equal(missingNameResponse.statusCode, 400)
  assert.deepEqual(missingNameResponse.body, {
    error: 'name_required',
    requestId: 'local-001',
  })
  const runtimeResponse = JSON.parse(runNode(['scripts/local_invoke.js', 'runtime-settings'], { cwd }).output)
  assert.equal(runtimeResponse.statusCode, 200)
  assert.equal(runtimeResponse.body.message, 'welcome runtime')
  assert.equal(runtimeResponse.body.runtime.greetingPrefix, 'welcome')
  assert.equal(runtimeResponse.body.runtime.memoryLimitInMB, '128')
  assert.equal(runtimeResponse.body.runtime.remainingTimeInMillis, 5000)
  validatedTopics.push('aws07')
}

if (shouldValidate('aws08')) {
  section('aws08 API Gateway event mapping and Lambda responses')
  const cwd = topicDirectory('aws08', 'api_gateway_lambda')
  checkFiles(cwd, 'src/handler.js', 'scripts/local_api.js')
  assert.equal(fs.existsSync(path.join(studyAwsRoot, 'src', 'infra', 'aws08_api_gateway_lambda', 'template.yaml')), true)
  await withServer({ cwd, script: 'scripts/local_api.js' }, async (port) => {
    const list = await request(port, '/items')
    assert.equal(list.status, 200)
    assert.equal(JSON.parse(list.body).items.length, 1)
    const item = await request(port, '/items/item-1?include=source')
    assert.equal(item.status, 200)
    assert.equal(JSON.parse(item.body).item.id, 'item-1')
    assert.deepEqual(JSON.parse(item.body).eventMapping.pathParameters, { id: 'item-1' })
    assert.deepEqual(JSON.parse(item.body).eventMapping.queryStringParameters, { include: 'source' })
    const created = await request(port, '/items', {
      method: 'POST', body: JSON.stringify({ name: 'validation' }),
      headers: { 'content-type': 'application/json' },
    })
    assert.equal(created.status, 201)
    assert.equal(JSON.parse(created.body).item.name, 'validation')
    const missingName = await request(port, '/items', {
      method: 'POST', body: '{}', headers: { 'content-type': 'application/json' },
    })
    assert.equal(missingName.status, 400)
    assert.deepEqual(JSON.parse(missingName.body), { error: 'name_required' })
    const invalidJson = await request(port, '/items', { method: 'POST', body: '{' })
    assert.equal(invalidJson.status, 400)
    assert.deepEqual(JSON.parse(invalidJson.body), { error: 'invalid_json' })
    const missingRoute = await request(port, '/missing')
    assert.equal(missingRoute.status, 404)
    assert.deepEqual(JSON.parse(missingRoute.body), { error: 'not_found' })
  })
  validatedTopics.push('aws08')
}

if (shouldValidate('aws09')) {
  section('aws09 health, missing configuration, runtime failure, and recovery')
  const cwd = topicDirectory('aws09', 'simple_deploy')
  checkFiles(cwd, 'app/server.js')
  assert.equal(fs.existsSync(path.join(cwd, 'Dockerfile')), true)
  assert.equal(fs.existsSync(path.join(cwd, '.env.example')), true)
  const dockerfile = fs.readFileSync(path.join(cwd, 'Dockerfile'), 'utf8')
  assert.match(dockerfile, /USER node/)
  assert.match(dockerfile, /EXPOSE 4109/)
  assert.match(dockerfile, /HOST=0\.0\.0\.0/)
  const environmentExample = fs.readFileSync(path.join(cwd, '.env.example'), 'utf8')
  assert.match(environmentExample, /^PORT=4109$/m)
  assert.match(environmentExample, /^HOST=127\.0\.0\.1$/m)
  assert.match(environmentExample, /^DEPLOY_ENV=local$/m)
  assert.doesNotMatch(environmentExample, /(SECRET|PASSWORD|TOKEN)=\S+/)
  await withServer({
    cwd,
    script: 'app/server.js',
    env: { APP_NAME: 'studyaws-validation', DEPLOY_ENV: 'validation' },
  }, async (port) => {
    const health = await request(port, '/health')
    assert.equal(health.status, 200)
    assert.deepEqual(JSON.parse(health.body), {
      ok: true,
      state: 'ready',
      appName: 'studyaws-validation',
      deployEnv: 'validation',
    })
    const config = await request(port, '/config')
    assert.equal(config.status, 200)
    assert.deepEqual(JSON.parse(config.body).missing, [])
    const missingConfig = await request(port, '/config?required=DEPLOY_TOKEN')
    assert.equal(missingConfig.status, 503)
    assert.deepEqual(JSON.parse(missingConfig.body).missing, ['DEPLOY_TOKEN'])
    const failure = await request(port, '/simulate-failure', { method: 'POST' })
    assert.equal(failure.status, 500)
    assert.equal(JSON.parse(failure.body).state, 'failed')
    const failedHealth = await request(port, '/health')
    assert.equal(failedHealth.status, 503)
    const recovery = await request(port, '/recover', { method: 'POST' })
    assert.equal(recovery.status, 200)
    assert.equal(JSON.parse(recovery.body).state, 'ready')
    assert.equal((await request(port, '/health')).status, 200)
  })
  validatedTopics.push('aws09')
}

if (shouldValidate('aws10')) {
  section('aws10 isolated backup, dry-run, restore, and missing backup')
  const cwd = topicDirectory('aws10', 'backup_restore')
  checkFiles(cwd, 'scripts/backup.js', 'scripts/restore.js', 'scripts/recovery_drill.js')
  const runDrill = (mode) => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'studyaws-backup-'))
    try {
      const output = runNode(['scripts/recovery_drill.js', mode], {
        cwd,
        env: { STUDYAWS_BACKUP_ROOT: temporaryRoot },
      }).output
      return JSON.parse(output)
    } finally {
      fs.rmSync(temporaryRoot, { recursive: true, force: true })
    }
  }
  assert.deepEqual(runDrill('backup'), {
    mode: 'backup',
    temporaryOnly: true,
    source: 'data/sample.json',
    backup: 'backups/sample-backup.json',
    backupExists: true,
    backupMatchesSource: true,
  })
  const dryRun = runDrill('dry-run')
  assert.equal(dryRun.restoreExecuted, false)
  assert.equal(dryRun.changedDataPreserved, true)
  assert.equal(dryRun.backupDiffersFromCurrent, true)
  const restore = runDrill('restore')
  assert.equal(restore.changedBeforeRestore, true)
  assert.equal(restore.restoredMatchesBackup, true)
  assert.equal(restore.restoredMatchesOriginal, true)
  const missingBackup = runDrill('missing-backup')
  assert.equal(missingBackup.backupExists, false)
  assert.equal(missingBackup.error, 'no_backup_found')
  validatedTopics.push('aws10')
}

console.log(`\nStudyAWS validation passed: ${validatedTopics.join(', ')}`)
