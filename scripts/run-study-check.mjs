import { spawn } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const catalog = JSON.parse(await readFile(path.join(root, 'catalog', 'fields.json'), 'utf8'))
const args = process.argv.slice(2)

if (args.length === 1 && args[0] === '--list') {
  for (const field of catalog.fields) {
    console.log(`${field.name}\t${field.unitKind}\t${field.lifecycle.mode}`)
  }
  process.exit(0)
}

if (args.length !== 2 || args[0] !== '--field') {
  console.error('Usage: node scripts/run-study-check.mjs --list | --field <name-or-id>')
  process.exit(2)
}

const requested = args[1].toLowerCase()
const field = catalog.fields.find((candidate) => candidate.id.toLowerCase() === requested || candidate.name.toLowerCase() === requested)
if (!field) {
  console.error(`Unknown field: ${args[1]}`)
  process.exit(2)
}

const check = field.lifecycle.check

async function resolveCommand(commandName) {
  if (commandName !== 'python') return commandName
  if (process.env.STUDY_PYTHON) return process.env.STUDY_PYTHON

  if (process.platform === 'win32' && process.env.USERPROFILE) {
    const version = (await readFile(path.join(root, '.python-version'), 'utf8')).trim()
    const pyenvPython = path.join(process.env.USERPROFILE, '.pyenv', 'pyenv-win', 'versions', version, 'python.exe')
    try {
      await access(pyenvPython)
      return pyenvPython
    } catch {
      // Fall back to the Python command available on PATH.
    }
  }

  return process.platform === 'win32' ? 'python' : 'python3'
}

const command = await resolveCommand(check.command)
const useShell = process.platform === 'win32' && check.command === 'npm'
const timeoutMs = check.timeoutSeconds * 1000

console.log(`Checking ${field.name}: ${check.command} ${check.args.join(' ')}`)
const child = spawn(command, check.args, {
  cwd: root,
  env: { ...process.env, PYTHONUTF8: process.env.PYTHONUTF8 ?? '1' },
  shell: useShell,
  stdio: 'inherit',
})

let timedOut = false
const timeout = setTimeout(() => {
  timedOut = true
  child.kill()
}, timeoutMs)

child.on('error', (error) => {
  clearTimeout(timeout)
  console.error(error.message)
  process.exitCode = 1
})

child.on('exit', (code, signal) => {
  clearTimeout(timeout)
  if (timedOut) {
    console.error(`${field.name} timed out after ${check.timeoutSeconds} seconds`)
    process.exitCode = 124
    return
  }
  if (signal) {
    console.error(`${field.name} stopped by signal ${signal}`)
    process.exitCode = 1
    return
  }
  process.exitCode = code ?? 1
})
