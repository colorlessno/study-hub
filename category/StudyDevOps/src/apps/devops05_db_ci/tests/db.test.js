import assert from 'node:assert/strict'
import pg from 'pg'

const client = new pg.Client({
  host: process.env.PGHOST ?? 'db',
  port: Number(process.env.PGPORT ?? '5432'),
  user: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD ?? 'postgres',
  database: process.env.PGDATABASE ?? 'studydevops',
})

await client.connect()
await client.query("INSERT INTO tasks (title, status) VALUES ('test task', 'open')")
const result = await client.query('SELECT title FROM tasks ORDER BY id')
assert.ok(result.rows.some((row) => row.title === 'seed task'))
assert.ok(result.rows.some((row) => row.title === 'test task'))
await client.query("DELETE FROM tasks WHERE title = 'test task'")
await client.end()
console.log('db test ok')
