import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const trackedFiles = execFileSync('git', ['ls-files', '-z'], {
  cwd: repositoryRoot,
  encoding: 'utf8'
})
  .split('\0')
  .filter(Boolean)
  .sort();
const candidateMarkers = [Buffer.from('node:20'), Buffer.from('node-version:')];
const forbiddenPatterns = [
  {
    description: 'EOL Node.js 20 container image',
    pattern: /\bnode:20(?:[-.@\s]|$)/
  },
  {
    description: 'EOL Node.js 20 setup-node version',
    pattern: /\bnode-version:\s*["']?20(?:\.\d+){0,2}["']?\s*(?:#.*)?$/
  }
];
const errors = [];

for (const relativePath of trackedFiles) {
  const bytes = readFileSync(resolve(repositoryRoot, relativePath));
  if (!candidateMarkers.some((marker) => bytes.includes(marker))) {
    continue;
  }

  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (error) {
    errors.push(`${relativePath}: candidate runtime configuration is not valid UTF-8 (${error.message})`);
    continue;
  }

  const lines = text.replaceAll('\r\n', '\n').split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    for (const forbidden of forbiddenPatterns) {
      if (forbidden.pattern.test(lines[index])) {
        errors.push(`${relativePath}:${index + 1}: ${forbidden.description}`);
      }
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`[node-runtime] ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`[node-runtime] ${trackedFiles.length} tracked files contain no Node.js 20 runtime configuration`);
}
