import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const studyDbRoot = fileURLToPath(new URL('../../../../', import.meta.url))
const environment = { ...process.env, STUDYDB_PORT: '0' }
const composeProject = process.env.STUDYDB_COMPOSE_PROJECT ?? 'studyhub-db04'
const composeArgs = [
  'compose',
  '-p',
  composeProject,
  '-f',
  'src/apps/common/docker-compose.yml',
  'exec',
  '-T',
  'db',
  'psql',
  '-v',
  'ON_ERROR_STOP=1',
  '-U',
  'postgres',
  '-d',
  'studydb',
]

function runPsql(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', [...composeArgs, '-c', sql], {
      cwd: studyDbRoot,
      env: environment,
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', reject)
    child.on('close', (code) => resolve({ code, stdout, stderr }))
  })
}

const observationSql = `
SET search_path TO db04;
BEGIN;
UPDATE products SET stock = stock - 1, updated_at = now() WHERE id = 1 RETURNING id, name, stock;
SELECT locktype, mode, granted
FROM pg_locks
WHERE pid = pg_backend_pid()
ORDER BY locktype, mode;
ROLLBACK;
SELECT id, name, stock FROM db04.products WHERE id = 1;
`

console.log('[ロック状態確認] 単一セッション内で更新、ロック状態確認、ROLLBACK、最終状態確認を順番に実行します。')
const result = await runPsql(observationSql)
if (result.code !== 0) {
  throw new Error(`ロック状態の確認に失敗しました。\n${result.stdout}${result.stderr}`)
}

console.log('[実行結果]')
console.log(result.stdout.trim())
