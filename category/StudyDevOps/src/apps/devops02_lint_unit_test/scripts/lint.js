import fs from 'node:fs'
import path from 'node:path'

const targets = ['src/calculator.js', 'test/calculator.test.js']
const banned = ['TO' + 'DO', 'TB' + 'D', 'pass' + 'word=', 'to' + 'ken=']
const failures = []

for (const target of targets) {
  const filePath = path.resolve(target)
  const text = fs.readFileSync(filePath, 'utf8')
  const lines = text.split(/\r?\n/)
  lines.forEach((line, index) => {
    if (/\s+$/.test(line)) failures.push(`${target}:${index + 1}: trailing whitespace`)
    for (const word of banned) {
      if (line.includes(word)) failures.push(`${target}:${index + 1}: banned token ${word}`)
    }
  })
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('lint ok')
