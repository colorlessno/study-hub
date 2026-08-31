import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const studyBaseRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const source = path.join(studyBaseRoot, 'src', 'samples', 'base07_branch_merge_conflict', 'practice_repo')
const operation = process.argv[2] ?? 'all-steps'
const supportedOperations = new Set([
  'branch-creation',
  'branch-commits',
  'conflict-reproduction',
  'conflict-resolution',
  'resolution-check',
  'all-steps',
])

if (!supportedOperations.has(operation)) {
  throw new Error(`未対応の操作です: ${operation}`)
}

function runGit(cwd, args, allowFailure = false) {
  const result = spawnSync('git', args, {
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
      `git ${args.join(' ')} が終了コード${result.status}で失敗しました。\n${stdout}\n${stderr}`.trimEnd()
    )
  }
  return {
    status: result.status ?? 1,
    stdout,
    stderr,
    output: [stdout, stderr].filter(Boolean).join('\n'),
  }
}

function printResult(title, command, output) {
  console.log(`\n## ${title}`)
  console.log(`$ ${command}`)
  console.log(output || '（出力なし）')
}

function initializeRepository(worktree) {
  runGit(worktree, ['init', '-b', 'main'])
  runGit(worktree, ['config', 'user.name', 'StudyBase Practice'])
  runGit(worktree, ['config', 'user.email', 'studybase@example.invalid'])
  runGit(worktree, ['config', 'core.excludesFile', emptyGlobalConfig])
  runGit(worktree, ['add', '.'])
  runGit(worktree, ['commit', '-m', 'Initial conflict practice state'])
}

function writeDecision(worktree, decision) {
  fs.writeFileSync(
    path.join(worktree, 'conflict_target.txt'),
    `Title: Conflict Practice\nDecision: ${decision}\nFooter: keep this line\n`,
    'utf8'
  )
}

function createFeatureBranch(worktree) {
  runGit(worktree, ['switch', '-c', 'feature/a'])
}

function createDivergentCommits(worktree) {
  createFeatureBranch(worktree)
  writeDecision(worktree, 'feature branch choice')
  runGit(worktree, ['add', 'conflict_target.txt'])
  runGit(worktree, ['commit', '-m', 'Change decision on feature branch'])
  runGit(worktree, ['switch', 'main'])
  writeDecision(worktree, 'main branch choice')
  runGit(worktree, ['add', 'conflict_target.txt'])
  runGit(worktree, ['commit', '-m', 'Change decision on main branch'])
}

function createConflict(worktree) {
  const merge = runGit(worktree, ['merge', 'feature/a'], true)
  const status = runGit(worktree, ['status', '--short']).stdout
  const content = fs.readFileSync(path.join(worktree, 'conflict_target.txt'), 'utf8')
  assert.notEqual(merge.status, 0)
  assert.match(merge.output, /CONFLICT/)
  assert.match(status, /^UU conflict_target\.txt$/m)
  assert.match(content, /<<<<<<< HEAD/)
  assert.match(content, /=======/)
  assert.match(content, />>>>>>> feature\/a/)
  return { merge, status, content }
}

function resolveConflict(worktree) {
  writeDecision(worktree, 'main and feature choices combined')
  runGit(worktree, ['add', 'conflict_target.txt'])
  const stagedDiff = runGit(worktree, ['diff', '--staged', '--', 'conflict_target.txt']).stdout
  assert.match(stagedDiff, /main and feature choices combined/)
  runGit(worktree, ['commit', '-m', 'Resolve practice conflict'])
  return stagedDiff
}

function checkResolution(worktree) {
  const status = runGit(worktree, ['status', '--short']).stdout
  const log = runGit(worktree, ['log', '--oneline', '--max-count=4']).stdout
  const content = fs.readFileSync(path.join(worktree, 'conflict_target.txt'), 'utf8').trimEnd()
  assert.equal(status, '')
  assert.match(log, /Resolve practice conflict/)
  assert.match(content, /main and feature choices combined/)
  assert.doesNotMatch(content, /<<<<<<<|=======|>>>>>>>/)
  return { status, log, content }
}

function showBranchCreation(worktree) {
  createFeatureBranch(worktree)
  const current = runGit(worktree, ['branch', '--show-current']).stdout
  const branches = runGit(worktree, ['branch', '--list']).stdout
  assert.equal(current, 'feature/a')
  assert.match(branches, /feature\/a/)
  assert.match(branches, /main/)
  printResult('現在のブランチ', 'git branch --show-current', current)
  printResult('ブランチ一覧', 'git branch --list', branches)
}

function showBranchCommits(worktree) {
  createDivergentCommits(worktree)
  const branches = runGit(worktree, ['branch', '-v']).stdout
  const graph = runGit(worktree, ['log', '--oneline', '--all', '--decorate', '--graph', '--max-count=5']).stdout
  assert.match(graph, /Change decision on feature branch/)
  assert.match(graph, /Change decision on main branch/)
  printResult('ブランチごとの最新コミット', 'git branch -v', branches)
  printResult('分岐した履歴', 'git log --oneline --all --decorate --graph --max-count=5', graph)
}

function showConflict(worktree) {
  createDivergentCommits(worktree)
  const conflict = createConflict(worktree)
  printResult('マージ結果', 'git merge feature/a', conflict.merge.output)
  printResult('競合中の状態', 'git status --short', conflict.status)
  printResult('競合マーカーを含むファイル', 'type conflict_target.txt', conflict.content.trimEnd())
}

function showResolution(worktree) {
  createDivergentCommits(worktree)
  createConflict(worktree)
  const stagedDiff = resolveConflict(worktree)
  printResult('統合した解消内容', 'git diff --staged -- conflict_target.txt', stagedDiff)
  printResult('解消コミット', 'git log --oneline --max-count=1', runGit(worktree, [
    'log', '--oneline', '--max-count=1',
  ]).stdout)
}

function showResolutionCheck(worktree) {
  createDivergentCommits(worktree)
  createConflict(worktree)
  resolveConflict(worktree)
  const result = checkResolution(worktree)
  printResult('解消後の状態', 'git status --short', result.status)
  printResult('解消後のファイル', 'type conflict_target.txt', result.content)
  printResult('解消を含む履歴', 'git log --oneline --max-count=4', result.log)
}

function runAll(worktree) {
  createDivergentCommits(worktree)
  printResult('分岐した履歴', 'git log --oneline --all --decorate --graph --max-count=5', runGit(worktree, [
    'log', '--oneline', '--all', '--decorate', '--graph', '--max-count=5',
  ]).stdout)
  const conflict = createConflict(worktree)
  printResult('マージ結果', 'git merge feature/a', conflict.merge.output)
  printResult('競合中の状態', 'git status --short', conflict.status)
  printResult('競合マーカーを含むファイル', 'type conflict_target.txt', conflict.content.trimEnd())
  printResult('統合した解消内容', 'git diff --staged -- conflict_target.txt', resolveConflict(worktree))
  const result = checkResolution(worktree)
  printResult('解消後の状態', 'git status --short', result.status)
  printResult('解消後のファイル', 'type conflict_target.txt', result.content)
  printResult('解消を含む履歴', 'git log --oneline --max-count=4', result.log)
}

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'studybase-git-conflict-'))
const worktree = path.join(temporaryRoot, 'practice')
const emptyGlobalConfig = path.join(temporaryRoot, 'empty-gitconfig')

try {
  fs.writeFileSync(emptyGlobalConfig, '', 'utf8')
  fs.cpSync(source, worktree, { recursive: true })
  initializeRepository(worktree)
  console.log('練習原本を一時フォルダへコピーしました。教材原本と本体リポジトリは変更しません。')
  if (operation === 'branch-creation') showBranchCreation(worktree)
  if (operation === 'branch-commits') showBranchCommits(worktree)
  if (operation === 'conflict-reproduction') showConflict(worktree)
  if (operation === 'conflict-resolution') showResolution(worktree)
  if (operation === 'resolution-check') showResolutionCheck(worktree)
  if (operation === 'all-steps') runAll(worktree)
  console.log('\nブランチ、競合、解消の確認が完了しました。')
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true })
}
