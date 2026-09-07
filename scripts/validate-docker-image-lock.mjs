import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lockPath = resolve(repositoryRoot, 'docker-images.lock.json');
const digestPattern = /^sha256:[0-9a-f]{64}$/;
const errors = [];
const argumentsSet = new Set(process.argv.slice(2));
const supportedArguments = new Set(['--check-remote']);

for (const argument of argumentsSet) {
  if (!supportedArguments.has(argument)) {
    errors.push(`unsupported argument: ${argument}`);
  }
}

function readStrictUtf8(path) {
  const bytes = readFileSync(path);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function hasExplicitTag(reference) {
  const leaf = reference.slice(reference.lastIndexOf('/') + 1);
  return leaf.includes(':');
}

function unquoteYamlScalar(value) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed.split(/\s+#/, 1)[0];
}

let lock;
try {
  lock = JSON.parse(readStrictUtf8(lockPath));
} catch (error) {
  errors.push(`docker-images.lock.json: ${error.message}`);
  lock = { images: [] };
}

if (lock.schemaVersion !== 1) {
  errors.push('docker-images.lock.json: schemaVersion must be 1');
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(lock.resolvedAt ?? '')) {
  errors.push('docker-images.lock.json: resolvedAt must use YYYY-MM-DD');
}
if (!Array.isArray(lock.images) || lock.images.length === 0) {
  errors.push('docker-images.lock.json: images must be a non-empty array');
}

const lockByTag = new Map();
for (const [index, image] of (lock.images ?? []).entries()) {
  const location = `docker-images.lock.json:images[${index}]`;
  if (typeof image.tag !== 'string' || image.tag.includes('@') || !hasExplicitTag(image.tag)) {
    errors.push(`${location}: tag must contain an explicit version tag and no digest`);
    continue;
  }
  if (!digestPattern.test(image.digest ?? '')) {
    errors.push(`${location}: digest must be a lowercase sha256 value`);
    continue;
  }
  if (typeof image.registry !== 'string' || image.registry.length === 0) {
    errors.push(`${location}: registry is required`);
  }
  if (lockByTag.has(image.tag)) {
    errors.push(`${location}: duplicate tag ${image.tag}`);
    continue;
  }
  lockByTag.set(image.tag, image);
}

const lockTags = [...lockByTag.keys()];
const sortedLockTags = [...lockTags].sort();
if (lockTags.some((tag, index) => tag !== sortedLockTags[index])) {
  errors.push('docker-images.lock.json: images must be sorted by tag');
}

let trackedFiles = [];
try {
  trackedFiles = execFileSync(
    'git',
    ['-c', 'core.quotepath=false', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: repositoryRoot, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
  )
    .split('\0')
    .filter(Boolean)
    .sort();
} catch (error) {
  errors.push(`git ls-files failed: ${error.message}`);
}

function isDockerConfiguration(relativePath) {
  const name = basename(relativePath);
  return name.startsWith('Dockerfile') || /^(?:docker-)?compose(?:\.[^.]+)?\.ya?ml$/i.test(name);
}

function looksLikeExternalImageReference(reference) {
  return reference.includes('@') || hasExplicitTag(reference);
}

const usedTags = new Map();
let referenceCount = 0;
let filesWithReferences = 0;

function validateReference(reference, relativePath, lineNumber) {
  if (reference === 'scratch') {
    return;
  }

  const separator = reference.lastIndexOf('@');
  if (separator <= 0) {
    errors.push(`${relativePath}:${lineNumber}: external image must use tag@sha256 digest`);
    return;
  }

  const tag = reference.slice(0, separator);
  const digest = reference.slice(separator + 1);
  if (!hasExplicitTag(tag)) {
    errors.push(`${relativePath}:${lineNumber}: pinned image must retain an explicit tag`);
  }
  if (!digestPattern.test(digest)) {
    errors.push(`${relativePath}:${lineNumber}: image digest must be a lowercase sha256 value`);
    return;
  }

  const locked = lockByTag.get(tag);
  if (!locked) {
    errors.push(`${relativePath}:${lineNumber}: ${tag} is missing from docker-images.lock.json`);
    return;
  }
  if (locked.digest !== digest) {
    errors.push(
      `${relativePath}:${lineNumber}: ${tag} digest differs from docker-images.lock.json`
    );
    return;
  }

  usedTags.set(tag, (usedTags.get(tag) ?? 0) + 1);
  referenceCount += 1;
}

for (const relativePath of trackedFiles.filter(
  (path) => isDockerConfiguration(path) || path.toLowerCase().endsWith('.md')
)) {
  let text;
  try {
    text = readStrictUtf8(resolve(repositoryRoot, relativePath));
  } catch (error) {
    errors.push(`${relativePath}: ${error.message}`);
    continue;
  }

  const lines = text.replaceAll('\r\n', '\n').split('\n');
  const stageNames = new Set();
  const dockerConfiguration = isDockerConfiguration(relativePath);
  let fileReferenceCount = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const from = lines[index].match(
      /^\s*FROM(?:\s+--platform=\S+)?\s+(\S+)(?:\s+AS\s+([A-Za-z0-9_.-]+))?/i
    );
    if (from) {
      if (
        from[1] !== 'scratch' &&
        !stageNames.has(from[1]) &&
        (dockerConfiguration || looksLikeExternalImageReference(from[1]))
      ) {
        validateReference(from[1], relativePath, index + 1);
        fileReferenceCount += 1;
      }
      if (from[2]) {
        stageNames.add(from[2]);
      }
      continue;
    }

    const image = lines[index].match(/^\s*image:\s+(.+)$/i);
    const imageReference = image ? unquoteYamlScalar(image[1]) : '';
    if (image && (dockerConfiguration || looksLikeExternalImageReference(imageReference))) {
      validateReference(imageReference, relativePath, index + 1);
      fileReferenceCount += 1;
    }
  }

  if (fileReferenceCount > 0) {
    filesWithReferences += 1;
  }
}

for (const tag of lockByTag.keys()) {
  if (!usedTags.has(tag)) {
    errors.push(`docker-images.lock.json: unused image entry ${tag}`);
  }
}

if (argumentsSet.has('--check-remote') && errors.length === 0) {
  for (const image of lock.images) {
    let output;
    try {
      output = execFileSync('docker', ['buildx', 'imagetools', 'inspect', image.tag], {
        cwd: repositoryRoot,
        encoding: 'utf8',
        maxBuffer: 20 * 1024 * 1024
      });
    } catch (error) {
      errors.push(`${image.tag}: remote digest lookup failed (${error.message})`);
      continue;
    }

    const match = output.match(/^Digest:\s+(sha256:[0-9a-f]{64})\s*$/m);
    if (!match) {
      errors.push(`${image.tag}: remote digest was not found in docker buildx output`);
    } else if (match[1] !== image.digest) {
      errors.push(`${image.tag}: remote digest changed from ${image.digest} to ${match[1]}`);
    } else {
      console.log(`[docker-image] remote digest unchanged: ${image.tag}`);
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`[docker-image] ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `[docker-image] ${referenceCount} references across ${filesWithReferences} files use ` +
      `${lockByTag.size} pinned multi-platform manifest digests`
  );
}
