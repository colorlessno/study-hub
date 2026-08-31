import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const studyBaseRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const sampleRoot = path.join(studyBaseRoot, 'src', 'samples', 'base08_issue_branch_pr_merge')
const seedSource = path.join(sampleRoot, 'gitea_lab', 'seed_repository')
const operation = process.argv[2] ?? 'all-steps'
const supportedOperations = new Set([
  'issue-and-branch',
  'change-and-push',
  'pull-request-check',
  'review-response',
  'merge-and-sync',
  'all-steps',
])

if (!supportedOperations.has(operation)) {
  throw new Error(`未対応の操作です: ${operation}`)
}

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'studybase-pr-workflow-'))
const emptyGlobalConfig = path.join(temporaryRoot, 'empty-gitconfig')
const remote = path.join(temporaryRoot, 'workflow-practice.git')
const developer = path.join(temporaryRoot, 'developer')
const integrator = path.join(temporaryRoot, 'integrator')

function run(command, args, cwd, allowFailure = false) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: emptyGlobalConfig,
    },
    maxBuffer: 4 * 1024 * 1024,
  })
  const stdout = (result.stdout ?? '').trimEnd()
  const stderr = (result.stderr ?? '').trimEnd()
  if (result.error) throw result.error
  if (!allowFailure && result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} が終了コード${result.status}で失敗しました。\n${stdout}\n${stderr}`.trimEnd()
    )
  }
  return {
    status: result.status ?? 1,
    stdout,
    stderr,
    output: [stdout, stderr].filter(Boolean).join('\n'),
  }
}

function git(cwd, args, allowFailure = false) {
  return run('git', args, cwd, allowFailure)
}

function node(cwd, args, allowFailure = false) {
  return run(process.execPath, args, cwd, allowFailure)
}

function sanitizeOutput(output) {
  const normalizedRoot = temporaryRoot.replaceAll('\\', '/')
  return output
    .replaceAll(`file:///${normalizedRoot}`, 'file:///<temporary-workspace>')
    .replaceAll(normalizedRoot, '<temporary-workspace>')
    .replaceAll(temporaryRoot, '<temporary-workspace>')
}

function printResult(title, command, output) {
  console.log(`\n## ${title}`)
  console.log(`$ ${command}`)
  console.log(output ? sanitizeOutput(output) : '（出力なし）')
}

function configureRepository(cwd, name, email) {
  git(cwd, ['config', 'user.name', name])
  git(cwd, ['config', 'user.email', email])
  git(cwd, ['config', 'core.excludesFile', emptyGlobalConfig])
}

function initializePractice() {
  fs.writeFileSync(emptyGlobalConfig, '', 'utf8')
  fs.cpSync(seedSource, developer, { recursive: true })
  git(temporaryRoot, ['init', '--bare', '--initial-branch=main', remote])
  git(developer, ['init', '-b', 'main'])
  configureRepository(developer, 'StudyBase Developer', 'developer@example.invalid')
  git(developer, ['add', '.'])
  git(developer, ['commit', '-m', 'Initialize workflow practice'])
  git(developer, ['remote', 'add', 'origin', remote])
  git(developer, ['push', '-u', 'origin', 'main'])
}

function showIssueAndCreateBranch() {
  const issue = fs.readFileSync(path.join(sampleRoot, 'sample_issue.md'), 'utf8').trimEnd()
  git(developer, ['switch', '-c', 'feature/issue-1-completion-rule'])
  const current = git(developer, ['branch', '--show-current']).stdout
  assert.equal(current, 'feature/issue-1-completion-rule')
  printResult('Issueで確認する内容', 'type sample_issue.md', issue)
  printResult('Issueに対応する作業ブランチ', 'git branch --show-current', current)
}

function addCompletionRuleAndPush() {
  const initialCheck = node(developer, ['scripts/check-workflow.mjs'], true)
  assert.notEqual(initialCheck.status, 0)
  assert.match(initialCheck.output, /完了条件/)

  const workflowPath = path.join(developer, 'docs', 'team-workflow.md')
  fs.appendFileSync(
    workflowPath,
    [
      '',
      '## 完了条件',
      '',
      '- 変更内容がIssueの完了条件を満たしている。',
      '- 自動検証が成功している。',
      '- review担当が差分を確認し、レビュー承認している。',
      '',
    ].join('\n'),
    'utf8'
  )
  const check = node(developer, ['scripts/check-workflow.mjs'])
  const diff = git(developer, ['diff', '--check']).stdout
  git(developer, ['add', 'docs/team-workflow.md'])
  git(developer, ['commit', '-m', 'docs: add merge completion rule'])
  git(developer, ['push', '-u', 'origin', 'feature/issue-1-completion-rule'])

  printResult('変更前の検証失敗', 'node scripts\\check-workflow.mjs', initialCheck.output)
  printResult('変更後の検証成功', 'node scripts\\check-workflow.mjs', check.stdout)
  printResult('空白エラーの確認', 'git diff --check', diff)
  printResult('リモートブランチ', 'git branch --remotes', git(developer, ['branch', '--remotes']).stdout)
}

function showPullRequest() {
  const pullRequest = fs.readFileSync(path.join(sampleRoot, 'sample_pull_request.md'), 'utf8').trimEnd()
  assert.match(pullRequest, /Closes\s+#1/)
  assert.match(pullRequest, /確認/)
  printResult('Pull Requestへ記録する内容', 'type sample_pull_request.md', pullRequest)
}

function addReviewFix() {
  const workflowPath = path.join(developer, 'docs', 'team-workflow.md')
  fs.appendFileSync(
    workflowPath,
    '- merge後、開発担当はローカルmainをremote mainへ同期している。\n',
    'utf8'
  )
  node(developer, ['scripts/check-workflow.mjs'])
  git(developer, ['add', 'docs/team-workflow.md'])
  git(developer, ['commit', '-m', 'docs: add local main synchronization'])
  git(developer, ['push'])

  const review = fs.readFileSync(path.join(sampleRoot, 'sample_review_response.md'), 'utf8').trimEnd()
  const workflow = fs.readFileSync(workflowPath, 'utf8')
  assert.match(review, /原因/)
  assert.match(review, /対処/)
  assert.match(review, /再確認/)
  assert.match(workflow, /ローカルmainをremote mainへ同期/)
  printResult('レビュー対応', 'type sample_review_response.md', review)
  printResult('同じPRへ追加したコミット', 'git log --oneline --max-count=2', git(developer, [
    'log', '--oneline', '--max-count=2',
  ]).stdout)
}

function mergeAndSynchronize() {
  git(temporaryRoot, ['clone', remote, integrator])
  configureRepository(integrator, 'StudyBase Integrator', 'integrator@example.invalid')
  git(integrator, ['fetch', 'origin', 'feature/issue-1-completion-rule'])
  git(integrator, ['merge', '--no-ff', '--no-edit', 'origin/feature/issue-1-completion-rule'])
  git(integrator, ['push', 'origin', 'main'])

  git(developer, ['switch', 'main'])
  git(developer, ['pull', '--ff-only', 'origin', 'main'])
  git(developer, ['fetch', '--prune', 'origin'])
  const localHead = git(developer, ['rev-parse', 'main']).stdout
  const remoteHead = git(developer, ['rev-parse', 'origin/main']).stdout
  const status = git(developer, ['status', '--short']).stdout
  assert.equal(localHead, remoteHead)
  assert.equal(status, '')

  printResult('マージ後の履歴', 'git log --oneline --graph --decorate --all --max-count=8', git(developer, [
    'log', '--oneline', '--graph', '--decorate', '--all', '--max-count=8',
  ]).stdout)
  printResult('ローカルmain', 'git rev-parse main', localHead)
  printResult('リモートmain', 'git rev-parse origin/main', remoteHead)
  printResult('同期後の状態', 'git status --short', status)
}

function prepareThroughPush() {
  showIssueAndCreateBranch()
  addCompletionRuleAndPush()
}

function prepareThroughReview() {
  prepareThroughPush()
  showPullRequest()
  addReviewFix()
}

try {
  initializePractice()
  console.log('一時フォルダに開発用リポジトリとローカルのbareリモートを作成しました。')
  console.log('実GitHub、教材原本、現在のリポジトリは変更しません。')
  if (operation === 'issue-and-branch') showIssueAndCreateBranch()
  if (operation === 'change-and-push') prepareThroughPush()
  if (operation === 'pull-request-check') {
    prepareThroughPush()
    showPullRequest()
  }
  if (operation === 'review-response') prepareThroughReview()
  if (operation === 'merge-and-sync' || operation === 'all-steps') {
    prepareThroughReview()
    mergeAndSynchronize()
  }
  console.log('\nIssue、ブランチ、push、PR、レビュー、マージ、同期の確認が完了しました。')
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true })
}
