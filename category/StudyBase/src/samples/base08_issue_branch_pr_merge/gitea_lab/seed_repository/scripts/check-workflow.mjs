import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const workflow = fs.readFileSync(path.join(repositoryRoot, 'docs', 'team-workflow.md'), 'utf8')

assert.match(workflow, /^## 完了条件$/m, '「## 完了条件」節を追加してください。')
assert.match(workflow, /レビュー承認/, '完了条件に「レビュー承認」を含めてください。')

console.log('workflow practice validation passed')
