import { readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const architectureRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const decoder = new TextDecoder('utf-8', { fatal: true });

const courses = [
  {
    id: 'arch01',
    directory: 'arch01_system_anatomy_walkthrough',
    appDirectory: 'arch01_system_anatomy_walkthrough',
    requiredDocs: [
      'target_system_summary.md',
      'context_container_component.md',
      'request_data_flow.md',
      'failure_mode.md',
      'evidence_vs_inference.md',
      'decision_notes.md'
    ],
    requiredSnippets: [
      '注文を保存',
      'POST /api/orders',
      'arch01専用SQLite',
      '障害モード',
      '証拠と推測'
    ]
  },
  {
    id: 'arch02',
    directory: 'arch02_evidence_driven_design_review',
    appDirectory: 'arch02_evidence_driven_design_review',
    requiredDocs: [
      'review_target.md',
      'curl_evidence.md',
      'evidence_checklist.md',
      'evidence_mapping.md',
      'findings.md',
      'residual_risk.md',
      'review_result_template.md'
    ],
    requiredSnippets: [
      '期待仕様',
      'HTTP 202',
      'SQLite',
      'Trace ID',
      'リスク受容'
    ]
  }
];

function readUtf8(filePath) {
  return decoder.decode(readFileSync(filePath));
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function validateCourse(course) {
  const courseRoot = path.join(architectureRoot, 'doc', 'learning_notes', course.directory);
  const activeFiles = [
    path.join(courseRoot, 'README.md'),
    ...course.requiredDocs.map((name) => path.join(courseRoot, 'docs', name)),
    path.join(architectureRoot, 'doc', 'requirements',
      course.id === 'arch01'
        ? 'arch01_system_anatomy_walkthrough_requirements.md'
        : 'arch02_evidence_driven_design_review_requirements.md'),
    path.join(architectureRoot, 'doc', 'basic_design', `${course.id}_basic_design.md`),
    path.join(architectureRoot, 'doc', 'detailed_design', `${course.id}_detailed_design.md`)
  ];
  const texts = activeFiles.map((filePath) => ({ filePath, text: readUtf8(filePath) }));
  const combined = texts.map(({ text }) => text).join('\n');

  for (const snippet of course.requiredSnippets) {
    requireCondition(combined.includes(snippet), `${course.id}: required description is missing: ${snippet}`);
  }
  for (const { filePath, text } of texts) {
    requireCondition(text.trim().length > 0, `${course.id}: empty document: ${filePath}`);
    requireCondition(!text.includes('devops07'), `${course.id}: active document still depends on devops07: ${filePath}`);
  }

  const appRoot = path.join(architectureRoot, 'src', 'apps', course.appDirectory);
  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1'], {
    cwd: appRoot,
    encoding: 'utf8',
    stdio: 'inherit',
    windowsHide: true
  });
  requireCondition(
    result.status === 0,
    `${course.id}: application tests failed${result.error ? `: ${result.error.message}` : ''}`
  );
  console.log(`PASS ${course.id}: documents, independent implementation, and sequential tests`);
}

for (const course of courses) validateCourse(course);
console.log('StudyArchitecture validation passed: arch01, arch02');
