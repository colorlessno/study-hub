import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workflowDirectory = resolve(repositoryRoot, '.github', 'workflows');
const workflowNames = readdirSync(workflowDirectory)
  .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
  .sort();
const orchestratorName = 'portfolio-validation.yml';
const errors = [];

function readStrictUtf8(path) {
  const bytes = readFileSync(path);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function validateConcurrency(name, lines) {
  const sectionIndexes = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] === 'concurrency:') {
      sectionIndexes.push(index);
    }
  }

  if (name !== orchestratorName) {
    if (sectionIndexes.length !== 0) {
      errors.push(`${name}: reusable workflows must leave concurrency to ${orchestratorName}`);
    }
    return;
  }

  if (sectionIndexes.length !== 1) {
    errors.push(`${name}: top-level concurrency must appear exactly once`);
    return;
  }

  const start = sectionIndexes[0];
  const block = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line !== '' && !line.startsWith('  ')) {
      break;
    }
    block.push(line);
  }

  if (!block.includes('  group: repository-validation')) {
    errors.push(`${name}: concurrency group must be repository-validation`);
  }
  if (!block.includes('  cancel-in-progress: false')) {
    errors.push(`${name}: queued validation must not be cancelled`);
  }
}

function validateTrigger(name, lines) {
  const onIndex = lines.indexOf('on:');
  if (onIndex < 0) {
    errors.push(`${name}: on section is missing`);
    return;
  }

  const block = [];
  for (let index = onIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line !== '' && !line.startsWith('  ')) {
      break;
    }
    block.push(line);
  }

  if (name === orchestratorName) {
    if (!block.includes('  push:') || !block.includes('  pull_request:')) {
      errors.push(`${name}: public validation must run for push and pull_request`);
    }
    return;
  }

  const triggers = block.filter((line) => /^  [A-Za-z0-9_-]+:$/.test(line));
  if (triggers.length !== 1 || triggers[0] !== '  workflow_call:') {
    errors.push(`${name}: reusable validation must only declare workflow_call`);
  }
}

function validatePermissions(name, lines) {
  const sectionIndexes = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] === 'permissions:') {
      sectionIndexes.push(index);
    }
  }

  if (sectionIndexes.length !== 1) {
    errors.push(`${name}: top-level permissions must appear exactly once`);
    return;
  }

  const block = [];
  for (let index = sectionIndexes[0] + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line !== '' && !line.startsWith('  ')) {
      break;
    }
    block.push(line);
  }

  const grants = block.filter((line) => /^  [A-Za-z0-9-]+:/.test(line));
  if (grants.length !== 1 || grants[0] !== '  contents: read') {
    errors.push(`${name}: permissions must grant only contents read access`);
  }

  if (lines.includes('    permissions:')) {
    errors.push(`${name}: job-level permissions are not allowed`);
  }
}

function validateMatrices(name, lines) {
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] !== '      matrix:') {
      continue;
    }

    let strategyStart = index - 1;
    while (strategyStart >= 0 && lines[strategyStart] !== '    strategy:') {
      if (lines[strategyStart] !== '' && !lines[strategyStart].startsWith('      ')) {
        break;
      }
      strategyStart -= 1;
    }

    if (strategyStart < 0 || lines[strategyStart] !== '    strategy:') {
      errors.push(`${name}:${index + 1}: matrix is not inside a job strategy`);
      continue;
    }

    const strategyBlock = lines.slice(strategyStart + 1, index + 1);
    if (!strategyBlock.includes('      max-parallel: 1')) {
      errors.push(`${name}:${index + 1}: matrix must set max-parallel to 1`);
    }
  }
}

function validateExternalActionPins(name, lines) {
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^\s*(?:-\s+)?uses:\s+([^\s#]+)(?:\s+#\s+(\S+))?\s*$/);
    if (!match) {
      continue;
    }

    const reference = match[1];
    if (reference.startsWith('./')) {
      continue;
    }

    if (!/^[^@\s]+@[0-9a-f]{40}$/.test(reference)) {
      errors.push(`${name}:${index + 1}: external actions must use a full commit SHA`);
    }
    if (!/^v\d+(?:\.\d+(?:\.\d+)?)?$/.test(match[2] ?? '')) {
      errors.push(`${name}:${index + 1}: pinned external actions must retain a version comment`);
    }
    if (
      reference.startsWith('actions/checkout@') &&
      (lines[index + 1] !== '        with:' || lines[index + 2] !== '          persist-credentials: false')
    ) {
      errors.push(`${name}:${index + 1}: checkout must disable persisted credentials`);
    }
  }
}

function validatePublicWorkflowSafety(name, lines) {
  const forbiddenTriggers = new Set([
    '  issue_comment:',
    '  pull_request_target:',
    '  repository_dispatch:',
    '  workflow_run:'
  ]);
  const untrustedExpression = /\$\{\{\s*(?:github\.event(?:\b|\.)|github\.(?:actor|head_ref|ref_name|triggering_actor)\b)/;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (forbiddenTriggers.has(line)) {
      errors.push(`${name}:${index + 1}: public validation must not use the ${line.trimEnd()} trigger`);
    }
    if (/\$\{\{\s*secrets\./.test(line)) {
      errors.push(`${name}:${index + 1}: public validation must not consume repository secrets`);
    }
    if (untrustedExpression.test(line)) {
      errors.push(`${name}:${index + 1}: public validation must not use untrusted GitHub context values`);
    }
  }
}

function validateDependencyInstalls(name, lines) {
  for (let index = 0; index < lines.length; index += 1) {
    if (/\bnpm\s+install(?:\s|$)/.test(lines[index])) {
      errors.push(`${name}:${index + 1}: Node.js dependencies must be installed with npm ci`);
    }
  }

  if (name !== 'studyai-learning-validation.yml') {
    return;
  }

  const expectedInstall = '        run: python -m pip install -e ".[dev]"';
  const pipInstalls = lines.filter((line) => line.includes('python -m pip install'));
  if (pipInstalls.length !== 1 || pipInstalls[0] !== expectedInstall) {
    errors.push(`${name}: Python dependencies must be installed once from the backend pyproject`);
  }
  if (!lines.includes('          cache: pip')) {
    errors.push(`${name}: setup-python must enable the pip cache`);
  }
  if (!lines.includes('          cache-dependency-path: category/StudyAI/src/backend/pyproject.toml')) {
    errors.push(`${name}: the pip cache must be keyed by the backend pyproject`);
  }
}

function validateJobOrder(name, lines) {
  const jobsIndex = lines.indexOf('jobs:');
  if (jobsIndex < 0) {
    errors.push(`${name}: jobs section is missing`);
    return;
  }

  const jobs = [];
  for (let index = jobsIndex + 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^  ([A-Za-z0-9_-]+):$/);
    if (match) {
      jobs.push({ name: match[1], index });
    }
  }

  if (jobs.length === 0) {
    errors.push(`${name}: no jobs were found`);
    return;
  }

  for (let index = 0; index < jobs.length; index += 1) {
    const current = jobs[index];
    const nextIndex = jobs[index + 1]?.index ?? lines.length;
    const block = lines.slice(current.index + 1, nextIndex);
    if (block.some((line) => line.startsWith('    uses: '))) {
      continue;
    }

    const timeoutLine = block.find((line) => line.startsWith('    timeout-minutes: '));
    const timeout = Number(timeoutLine?.slice('    timeout-minutes: '.length));
    if (!Number.isInteger(timeout) || timeout < 1 || timeout > 360) {
      errors.push(`${name}: job ${current.name} must set timeout-minutes from 1 to 360`);
    }
  }

  for (let index = 1; index < jobs.length; index += 1) {
    const current = jobs[index];
    const previous = jobs[index - 1];
    const nextIndex = jobs[index + 1]?.index ?? lines.length;
    const block = lines.slice(current.index + 1, nextIndex);
    if (!block.includes(`    needs: ${previous.name}`)) {
      errors.push(`${name}: job ${current.name} must need the immediately preceding job ${previous.name}`);
    }
  }
}

function validateReusableCalls(lines) {
  for (const name of workflowNames) {
    if (name === orchestratorName) {
      continue;
    }
    const call = `    uses: ./.github/workflows/${name}`;
    const count = lines.filter((line) => line === call).length;
    if (count !== 1) {
      errors.push(`${orchestratorName}: ${name} must be called exactly once`);
    }
  }
}

for (const name of workflowNames) {
  const path = resolve(workflowDirectory, name);
  let text;
  try {
    text = readStrictUtf8(path);
  } catch (error) {
    errors.push(`${name}: ${error.message}`);
    continue;
  }

  const lines = text.replaceAll('\r\n', '\n').split('\n');
  validateTrigger(name, lines);
  validateConcurrency(name, lines);
  validatePermissions(name, lines);
  validateMatrices(name, lines);
  validateExternalActionPins(name, lines);
  validatePublicWorkflowSafety(name, lines);
  validateDependencyInstalls(name, lines);
  validateJobOrder(name, lines);
}

try {
  const orchestratorPath = resolve(workflowDirectory, orchestratorName);
  const orchestratorLines = readStrictUtf8(orchestratorPath).replaceAll('\r\n', '\n').split('\n');
  validateReusableCalls(orchestratorLines);
} catch (error) {
  errors.push(`${orchestratorName}: ${error.message}`);
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`[workflow] ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`[workflow] ${workflowNames.length} workflows are configured for sequential execution`);
}
