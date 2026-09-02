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
  validateMatrices(name, lines);
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
