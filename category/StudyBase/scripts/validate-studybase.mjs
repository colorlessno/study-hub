import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const studyBaseRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const require = createRequire(import.meta.url)
const repositoryRoot = path.dirname(studyBaseRoot)
const samplesRoot = path.join(studyBaseRoot, 'src', 'samples')
const templatesRoot = path.join(studyBaseRoot, 'doc', 'templates')
const supportedTopics = Array.from({ length: 12 }, (_, index) => `base${String(index + 1).padStart(2, '0')}`)
const requestedTopics = process.argv.slice(2)

for (const topic of requestedTopics) {
  if (!supportedTopics.includes(topic)) {
    throw new Error(`Unknown topic: ${topic}. Choose ${supportedTopics.join(', ')}.`)
  }
}

const shouldValidate = (topic) => requestedTopics.length === 0 || requestedTopics.includes(topic)
const validatedTopics = []

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || studyBaseRoot,
    encoding: 'utf8',
    env: { ...process.env, ...options.env },
    maxBuffer: 8 * 1024 * 1024,
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ? `${result.error.message}\n` : ''}`
  if (!options.allowFailure && result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\n${output}`)
  }
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '', output }
}

function runNpm(args, options = {}) {
  if (process.platform === 'win32') {
    const command = ['npm.cmd', ...args].join(' ')
    return run(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', command], options)
  }
  return run('npm', args, options)
}

function assertFiles(root, files) {
  for (const relativePath of files) {
    const target = path.join(root, relativePath)
    assert.equal(fs.existsSync(target), true, `missing ${target}`)
    assert.ok(fs.statSync(target).size > 0, `empty ${target}`)
  }
}

function section(title) {
  console.log(`\n[StudyBase] ${title}`)
}

function withTemporaryCopy(prefix, source, exercise) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  const worktree = path.join(temporaryRoot, 'practice')
  fs.cpSync(source, worktree, { recursive: true })
  try {
    exercise(worktree)
  } finally {
    if (path.dirname(temporaryRoot) === os.tmpdir() && path.basename(temporaryRoot).startsWith(prefix)) {
      fs.rmSync(temporaryRoot, { recursive: true, force: true })
    }
  }
}

function initializeGit(worktree) {
  run('git', ['init', '-b', 'main'], { cwd: worktree })
  run('git', ['config', 'user.name', 'StudyBase Validation'], { cwd: worktree })
  run('git', ['config', 'user.email', 'studybase@example.invalid'], { cwd: worktree })
  run('git', ['add', '.'], { cwd: worktree })
  run('git', ['commit', '-m', 'Initial practice state'], { cwd: worktree })
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
      hostname: '127.0.0.1', port, path: requestPath,
      method: options.method || 'GET',
      headers: { ...options.headers, ...(body ? { 'content-length': Buffer.byteLength(body) } : {}) },
      timeout: 1000,
    }, (res) => {
      let responseBody = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => { responseBody += chunk })
      res.on('end', () => resolve({ status: res.statusCode, body: responseBody, headers: res.headers }))
    })
    req.once('timeout', () => req.destroy(new Error('request_timeout')))
    req.once('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

async function waitUntilReady(child, timeoutMs = 5000) {
  await new Promise((resolve, reject) => {
    let output = ''
    let finished = false
    let timer
    const cleanup = () => {
      child.stdout.off('data', onData)
      child.stderr.off('data', onData)
      child.off('exit', onExit)
      if (timer) clearTimeout(timer)
    }
    const finish = (error) => {
      if (finished) return
      finished = true
      cleanup()
      if (error) reject(error)
      else resolve()
    }
    const onData = (chunk) => {
      output += chunk.toString('utf8')
      if (output.includes('sample api listening on http://127.0.0.1:')) finish()
    }
    const onExit = (code) => finish(new Error(`sample API exited before startup: ${code}\n${output}`))
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.once('exit', onExit)
    timer = setTimeout(() => finish(new Error(`sample API did not report startup within 5 seconds\n${output}`)), timeoutMs)
  })
}

async function waitForChildExit(child, timeoutMs = 1000) {
  if (child.exitCode !== null) return
  await new Promise((resolve) => {
    let finished = false
    let timer
    const finish = () => {
      if (finished) return
      finished = true
      if (timer) clearTimeout(timer)
      resolve()
    }
    child.once('exit', finish)
    timer = setTimeout(finish, timeoutMs)
  })
}

async function withApiServer(cwd, verify) {
  const port = await getFreePort()
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd,
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  try {
    await waitUntilReady(child)
    await verify(port)
  } finally {
    child.kill()
    await waitForChildExit(child)
  }
}

if (shouldValidate('base01')) {
  section('base01 ambiguous request evidence and templates')
  assertFiles(path.join(samplesRoot, 'base01_ambiguous_request_hearing'), ['ambiguous_request_case.md', 'completed_hearing_note.md'])
  assertFiles(path.join(templatesRoot, 'base01_ambiguous_request_hearing'), ['request_hearing_note.md', 'requirement_input_summary.md'])
  validatedTopics.push('base01')
}

if (shouldValidate('base02')) {
  section('base02 provisional deliverable evidence and templates')
  assertFiles(path.join(samplesRoot, 'base02_incomplete_information_deliverable'), ['incomplete_case.md', 'completed_provisional_deliverable.md'])
  assertFiles(path.join(templatesRoot, 'base02_incomplete_information_deliverable'), ['assumption_list.md', 'deliverable_limitation_note.md', 'provisional_deliverable.md', 'unknown_issues_list.md'])
  validatedTopics.push('base02')
}

if (shouldValidate('base03')) {
  section('base03 estimate evidence and templates')
  assertFiles(path.join(samplesRoot, 'base03_estimate_basis'), ['estimate_case.md', 'completed_estimate_basis.md'])
  assertFiles(path.join(templatesRoot, 'base03_estimate_basis'), ['estimate_basis.md', 'risk_list.md', 'work_breakdown.md'])
  validatedTopics.push('base03')
}

if (shouldValidate('base04')) {
  section('base04 test precondition evidence and templates')
  assertFiles(path.join(samplesRoot, 'base04_test_precondition_checklist'), ['test_precondition_case.md', 'completed_test_precondition_checklist.md'])
  assertFiles(path.join(templatesRoot, 'base04_test_precondition_checklist'), ['test_data_check.md', 'test_environment_check.md', 'test_precondition_checklist.md'])
  const preconditions = await import(pathToFileURL(path.join(
    studyBaseRoot,
    'src',
    'apps',
    'base04_test_precondition_checklist',
    'app',
    'src',
    'preconditions.js',
  )).href)
  assert.deepEqual(
    preconditions.environmentDefinitions,
    [
      { id: 'E-01', label: 'URL', number: 1 },
      { id: 'E-02', label: 'DB', number: 2 },
      { id: 'E-03', label: '外部連携', number: 3 },
      { id: 'E-04', label: 'アカウント', number: 4 },
      { id: 'E-05', label: 'ログ確認先', number: 5 },
    ],
  )
  validatedTopics.push('base04')
}

if (shouldValidate('base05')) {
  section('base05 responsibility evidence and templates')
  assertFiles(path.join(samplesRoot, 'base05_raci_responsibility_matrix'), ['responsibility_case.md', 'completed_raci_matrix.md'])
  assertFiles(path.join(templatesRoot, 'base05_raci_responsibility_matrix'), ['decision_pending_list.md', 'escalation_note.md', 'raci_matrix.md'])
  validatedTopics.push('base05')
}

if (shouldValidate('base06')) {
  section('base06 isolated Git status and diff practice')
  const source = path.join(samplesRoot, 'base06_git_basic', 'practice_repo')
  const practiceScript = path.join(studyBaseRoot, 'scripts', 'base06-git-practice.mjs')
  assert.equal(fs.existsSync(practiceScript), true, `missing ${practiceScript}`)
  withTemporaryCopy('studybase-git-basic-', source, (worktree) => {
    initializeGit(worktree)
    fs.appendFileSync(path.join(worktree, 'notes.txt'), 'Line 3: validation change\n', 'utf8')
    const status = run('git', ['status', '--short'], { cwd: worktree })
    const diff = run('git', ['diff', '--', 'notes.txt'], { cwd: worktree })
    assert.match(status.output, /M notes\.txt/)
    assert.match(diff.output, /validation change/)
  })
  const practice = run(process.execPath, ['scripts/base06-git-practice.mjs', 'all-states'])
  assert.match(practice.output, /未ステージの変更/)
  assert.match(practice.output, /ステージ済みの差分/)
  assert.match(practice.output, /コミット後の履歴/)
  assert.match(practice.output, /除外規則/)
  validatedTopics.push('base06')
}

if (shouldValidate('base07')) {
  section('base07 isolated branch conflict and resolution')
  const practice = run(process.execPath, ['scripts/base07-git-conflict-practice.mjs', 'all-steps'])
  assert.match(practice.output, /分岐した履歴/)
  assert.match(practice.output, /UU conflict_target\.txt/)
  assert.match(practice.output, /<<<<<<< HEAD/)
  assert.match(practice.output, /main and feature choices combined/)
  assert.match(practice.output, /解消後の状態/)
  validatedTopics.push('base07')
}

if (shouldValidate('base08')) {
  section('base08 issue, PR, review response, and local Gitea lab')
  assertFiles(path.join(samplesRoot, 'base08_issue_branch_pr_merge'), ['sample_issue.md', 'sample_pull_request.md', 'sample_review_response.md'])
  assertFiles(path.join(templatesRoot, 'base08_issue_branch_pr_merge'), ['issue_template.md', 'pull_request_template.md', 'review_response_note.md'])
  const lab = path.join(samplesRoot, 'base08_issue_branch_pr_merge', 'gitea_lab')
  assertFiles(lab, ['README.md', 'docker-compose.yml', 'review_scenario.md', 'seed_repository/README.md', 'seed_repository/docs/team-workflow.md', 'seed_repository/scripts/check-workflow.mjs'])
  const compose = fs.readFileSync(path.join(lab, 'docker-compose.yml'), 'utf8')
  assert.match(compose, /127\.0\.0\.1:3418:3000/, 'Gitea Web UI must bind to localhost only')
  assert.match(compose, /gitea_data:\/data/, 'Gitea must use an isolated named volume')
  const practice = run(process.execPath, ['scripts/base08-pr-workflow-practice.mjs', 'all-steps'])
  assert.match(practice.output, /Issueに対応する作業ブランチ/)
  assert.match(practice.output, /変更前の検証失敗/)
  assert.match(practice.output, /<temporary-workspace>\/developer\/scripts\/check-workflow\.mjs/)
  assert.match(practice.output, /ローカルmain/)
  assert.match(practice.output, /リモートmain/)
  assert.match(practice.output, /Issue、ブランチ、push、PR、レビュー、マージ、同期の確認が完了しました。/)
  assert.doesNotMatch(
    practice.output,
    /(?:file:\/\/\/)?[A-Za-z]:[\\/][^\r\n]*studybase-pr-workflow-/,
    'base08 output must not expose the host temporary path'
  )
  validatedTopics.push('base08')
}

if (shouldValidate('base09')) {
  section('base09 npm dev, build, test, and start scripts')
  const cwd = path.join(samplesRoot, 'base09_npm_scripts', 'sample_node_project')
  assert.match(runNpm(['run', 'dev'], { cwd }).output, /npm script practice: dev/)
  runNpm(['run', 'build'], { cwd })
  assert.match(runNpm(['test'], { cwd }).output, /smoke test passed/)
  assert.match(runNpm(['start'], { cwd }).output, /npm script practice: start/)
  const missingScript = runNpm(['--logs-max=0', 'run', 'missing-script'], { cwd, allowFailure: true })
  assert.notEqual(missingScript.status, 0)
  assert.match(missingScript.output, /Missing script/)
  assert.doesNotMatch(missingScript.output, /[A-Za-z]:[\\/]/)
  validatedTopics.push('base09')
}

if (shouldValidate('base10')) {
  section('base10 direct API success and failure responses')
  const cwd = path.join(samplesRoot, 'base10_curl_api_check', 'sample_api')
  const source = fs.readFileSync(path.join(cwd, 'src', 'server.js'), 'utf8')
  const dockerfile = fs.readFileSync(path.join(cwd, 'Dockerfile'), 'utf8')
  assert.match(source, /const host = process\.env\.HOST \|\| '127\.0\.0\.1'/)
  assert.match(source, /server\.listen\(port, host/)
  assert.match(dockerfile, /ENV HOST=0\.0\.0\.0/)
  run(process.execPath, ['--check', 'src/server.js'], { cwd })
  await withApiServer(cwd, async (port) => {
    assert.equal((await request(port, '/health')).status, 200)
    assert.equal(JSON.parse((await request(port, '/items')).body).items.length, 1)
    assert.equal((await request(port, '/items', { method: 'POST', body: JSON.stringify({ name: 'validation' }), headers: { 'content-type': 'application/json' } })).status, 201)
    assert.equal((await request(port, '/items', { method: 'POST', body: '{', headers: { 'content-type': 'application/json' } })).status, 400)
    assert.equal((await request(port, '/private')).status, 401)
    assert.equal((await request(port, '/private', { headers: { authorization: 'Bearer studybase' } })).status, 200)
    assert.equal((await request(port, '/forbidden')).status, 403)
    assert.equal((await request(port, '/missing')).status, 404)
    const methodNotAllowed = await request(port, '/health', { method: 'POST' })
    assert.equal(methodNotAllowed.status, 405)
    assert.equal(methodNotAllowed.headers.allow, 'GET')
    assert.equal((await request(port, '/items', { method: 'POST', body: JSON.stringify({ name: 'x'.repeat(160) }), headers: { 'content-type': 'application/json' } })).status, 413)
    assert.equal((await request(port, '/items', { method: 'POST', body: 'plain text', headers: { 'content-type': 'text/plain' } })).status, 415)
    assert.equal((await request(port, '/error')).status, 500)
    assert.equal((await request(port, '/upstream-error')).status, 502)
  })
  validatedTopics.push('base10')
}

if (shouldValidate('base11')) {
  section('base11 portfolio presentation screen and output builder')
  const docs = path.join(studyBaseRoot, 'doc', 'learning_notes', 'base11_portfolio_demo_presentation', 'docs')
  assertFiles(docs, ['demo_script_60s.md', 'demo_script_3min.md', 'demo_script_5min.md', 'evidence_selection.md', 'limitation_note.md', 'target_selection.md', 'video_structure.md'])
  const app = path.join(studyBaseRoot, 'src', 'apps', 'base11_portfolio_demo_presentation', 'app')
  assertFiles(app, ['index.html', 'src/main.js', 'src/presentation.js', 'src/style.css'])
  const sample = path.join(samplesRoot, 'base11_portfolio_demo_presentation')
  assertFiles(sample, ['presentation_case.json', 'completed_presentation.md'])
  const sampleCase = JSON.parse(fs.readFileSync(path.join(sample, 'presentation_case.json'), 'utf8'))
  const completedPresentation = fs.readFileSync(path.join(sample, 'completed_presentation.md'), 'utf8')
  const presentation = require(path.join(app, 'src', 'presentation.js'))
  assert.equal(sampleCase.components, presentation.sampleInput.components)
  assert.equal(sampleCase.verified, presentation.sampleInput.verified)
  assert.match(presentation.sampleInput.verified, /12操作/)
  assert.match(presentation.sampleInput.verified, /11種類の状態コード/)
  assert.doesNotMatch(presentation.sampleInput.verified, /\d+件のテスト/)
  assert.match(completedPresentation, /12操作/)
  assert.match(completedPresentation, /11種類の状態コード/)
  const artifacts = presentation.buildPresentationArtifacts({
    ...presentation.sampleInput,
    evidence: '画面\nAPI応答\nテスト結果\n4件目は使用しない',
  })
  assert.equal(artifacts.ok, true)
  assert.match(artifacts.sixty, /StudyHubのAPI状態コード教材/)
  assert.match(artifacts.three, /【確認した事実】/)
  assert.match(artifacts.five, /【設計上の説明】/)
  assert.match(artifacts.recording, /3\. 構成を示す/)
  assert.equal(artifacts.input.evidence.length, 3)
  const invalid = presentation.validatePresentationInput({})
  assert.equal(invalid.ok, false)
  assert.ok(invalid.missing.includes('成果物の名前'))
  validatedTopics.push('base11')
}

if (shouldValidate('base12')) {
  section('base12 guide to canonical StudyArchitecture arch01 theme')
  const guide = path.join(studyBaseRoot, 'doc', 'learning_notes', 'base12_system_anatomy_walkthrough')
  assertFiles(guide, ['README.md'])
  const guideContent = fs.readFileSync(path.join(guide, 'README.md'), 'utf8')
  assert.match(guideContent, /\/themes\/arch01\?catalog=actual/)
  assert.match(guideContent, /学習本体はarch01/)
  const canonical = path.join(repositoryRoot, 'StudyArchitecture', 'doc', 'learning_notes', 'arch01_system_anatomy_walkthrough')
  assertFiles(canonical, [
    'README.md',
    'docs/target_system_summary.md',
    'docs/context_container_component.md',
    'docs/evidence_vs_inference.md',
    'docs/request_data_flow.md',
    'docs/failure_mode.md',
    'docs/decision_notes.md',
  ])
  const targetSummary = fs.readFileSync(path.join(canonical, 'docs', 'target_system_summary.md'), 'utf8')
  assert.match(targetSummary, /arch01専用の注文登録システム/)
  assert.doesNotMatch(guideContent, /devops07/)
  validatedTopics.push('base12')
}

console.log(`\nStudyBase validation passed: ${validatedTopics.join(', ')}`)
