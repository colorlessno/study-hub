import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const studyBaseRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const source = path.join(studyBaseRoot, 'src', 'samples', 'base06_git_basic', 'practice_repo')
const operation = process.argv[2] ?? 'all-states'
const supportedOperations = new Set([
  'clean-state',
  'unstaged-diff',
  'staged-diff',
  'commit-history',
  'ignored-file',
  'all-states',
])

if (!supportedOperations.has(operation)) {
  throw new Error(`未対応の操作です: ${operation}`)
}

function runGit(cwd, args) {
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
  const output = (result.stdout ?? '').trimEnd()
  const errorOutput = (result.stderr ?? '').trimEnd()
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} が終了コード${result.status}で失敗しました。\n${output}\n${errorOutput}`.trimEnd()
    )
  }
  return output
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
  runGit(worktree, ['add', '.'])
  runGit(worktree, ['commit', '-m', 'Initial practice state'])
}

function modifyNotes(worktree) {
  fs.appendFileSync(path.join(worktree, 'notes.txt'), '3行目: StudyHubから加えた変更\n', 'utf8')
}

function showCleanState(worktree) {
  const status = runGit(worktree, ['status', '--short'])
  assert.equal(status, '')
  printResult('変更前', 'git status --short', status)
  console.log('作業フォルダ、ステージ、最新コミットの内容が一致しています。')
}

function showUnstagedDiff(worktree) {
  modifyNotes(worktree)
  const status = runGit(worktree, ['status', '--short'])
  const diff = runGit(worktree, ['diff', '--', 'notes.txt'])
  assert.match(status, /M notes\.txt/)
  assert.match(diff, /StudyHubから加えた変更/)
  printResult('未ステージの変更', 'git status --short', status)
  printResult('未ステージの差分', 'git diff -- notes.txt', diff)
}

function showStagedDiff(worktree) {
  modifyNotes(worktree)
  runGit(worktree, ['add', 'notes.txt'])
  const status = runGit(worktree, ['status', '--short'])
  const unstagedDiff = runGit(worktree, ['diff', '--', 'notes.txt'])
  const stagedDiff = runGit(worktree, ['diff', '--staged', '--', 'notes.txt'])
  assert.match(status, /^M  notes\.txt$/m)
  assert.equal(unstagedDiff, '')
  assert.match(stagedDiff, /StudyHubから加えた変更/)
  printResult('ステージ済みの変更', 'git status --short', status)
  printResult('未ステージ側の差分', 'git diff -- notes.txt', unstagedDiff)
  printResult('コミット候補の差分', 'git diff --staged -- notes.txt', stagedDiff)
}

function showCommitHistory(worktree) {
  modifyNotes(worktree)
  runGit(worktree, ['add', 'notes.txt'])
  runGit(worktree, ['commit', '-m', 'Add a practice note'])
  const status = runGit(worktree, ['status', '--short'])
  const log = runGit(worktree, ['log', '--oneline', '--max-count=2'])
  assert.equal(status, '')
  assert.match(log, /Add a practice note/)
  printResult('コミット後の状態', 'git status --short', status)
  printResult('直近の履歴', 'git log --oneline --max-count=2', log)
}

function showIgnoredFile(worktree) {
  fs.writeFileSync(path.join(worktree, 'runtime.log'), '一時ログ\n', 'utf8')
  const ignoreRule = runGit(worktree, ['check-ignore', '-v', 'runtime.log'])
  const status = runGit(worktree, ['status', '--short'])
  assert.match(ignoreRule, /\*\.log/)
  assert.equal(status, '')
  printResult('除外規則', 'git check-ignore -v runtime.log', ignoreRule)
  printResult('除外後の状態', 'git status --short', status)
}

function runOne(selectedOperation, worktree) {
  if (selectedOperation === 'clean-state') showCleanState(worktree)
  if (selectedOperation === 'unstaged-diff') showUnstagedDiff(worktree)
  if (selectedOperation === 'staged-diff') showStagedDiff(worktree)
  if (selectedOperation === 'commit-history') showCommitHistory(worktree)
  if (selectedOperation === 'ignored-file') showIgnoredFile(worktree)
}

function runAll(worktree) {
  showCleanState(worktree)
  showUnstagedDiff(worktree)
  runGit(worktree, ['add', 'notes.txt'])
  const stagedDiff = runGit(worktree, ['diff', '--staged', '--', 'notes.txt'])
  assert.match(stagedDiff, /StudyHubから加えた変更/)
  printResult('ステージ済みの差分', 'git diff --staged -- notes.txt', stagedDiff)
  runGit(worktree, ['commit', '-m', 'Add a practice note'])
  printResult('コミット後の履歴', 'git log --oneline --max-count=2', runGit(worktree, [
    'log', '--oneline', '--max-count=2',
  ]))
  showIgnoredFile(worktree)
}

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'studybase-git-basic-'))
const worktree = path.join(temporaryRoot, 'practice')
const emptyGlobalConfig = path.join(temporaryRoot, 'empty-gitconfig')

try {
  fs.writeFileSync(emptyGlobalConfig, '', 'utf8')
  fs.cpSync(source, worktree, { recursive: true })
  initializeRepository(worktree)
  console.log('練習原本を一時フォルダへコピーしました。教材原本と本体リポジトリは変更しません。')
  if (operation === 'all-states') runAll(worktree)
  else runOne(operation, worktree)
  console.log('\nGit基本操作の確認が完了しました。')
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true })
}
