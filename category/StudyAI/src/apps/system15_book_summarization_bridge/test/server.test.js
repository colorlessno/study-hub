import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createBookSummarizationBridge } from '../app/server.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));

async function startFixture() {
  const directory = await mkdtemp(path.join(tmpdir(), 'system15-test-'));
  const cliRoot = path.join(directory, 'book_summarization_cli');
  const inputDirectory = path.join(directory, 'input');
  await mkdir(path.join(cliRoot, 'cli'), { recursive: true });
  await mkdir(inputDirectory, { recursive: true });
  await writeFile(path.join(cliRoot, 'cli', 'cli_main.py'), '# fake entry\n', 'utf8');
  await writeFile(path.join(cliRoot, 'cli', 'config.toml'), '[capture_task]\noutput_dir = "capture"\n', 'utf8');
  await writeFile(path.join(inputDirectory, 'page_0001.png'), 'png', 'utf8');
  const { server } = createBookSummarizationBridge({
    cliRoot,
    runtimeRoot: path.join(directory, 'runtime'),
    pythonCommand: process.execPath,
    pythonPrefixArgs: [path.join(testDirectory, 'fake-runner.js')]
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    inputDirectory,
    close: async () => {
      await new Promise((resolve) => server.close(resolve));
      await rm(directory, { recursive: true, force: true });
    }
  };
}

test('画像を作業領域へ取り込み、既存CLIプロセスの結果を保存して参照する', async () => {
  const fixture = await startFixture();
  try {
    const response = await fetch(`${fixture.baseUrl}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input_type: 'image_dir',
        input_path: fixture.inputDirectory,
        book_id: 'fixture_book',
        max_pages: 10,
        resume: true,
        enable_visual_extraction: false,
        output_formats: ['markdown'],
        target_tasks: [2],
        rights_confirmed: true
      })
    });
    assert.equal(response.status, 200);
    const created = await response.json();
    assert.equal(created.status, 'completed');
    const job = await fetch(`${fixture.baseUrl}/api/jobs/${created.job_id}`).then((result) => result.json());
    assert.equal(job.status, 'completed');
    assert.match(job.log, /pipeline completed/);

    const sections = await fetch(`${fixture.baseUrl}/api/jobs/${created.job_id}/sections`)
      .then((result) => result.json());
    assert.equal(sections.sections[0].section_id, '01-introduction');
    assert.match(sections.sections[0].summary_text, /CLIプロセス/);

    const artifacts = await fetch(`${fixture.baseUrl}/api/jobs/${created.job_id}/artifacts`)
      .then((result) => result.json());
    assert.ok(artifacts.artifacts.some((item) => item.artifact_type === 'sections_summary'));
  } finally {
    await fixture.close();
  }
});

test('利用条件未確認のジョブを開始しない', async () => {
  const fixture = await startFixture();
  try {
    const response = await fetch(`${fixture.baseUrl}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input_type: 'capture', book_id: 'fixture_book' })
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /著作権/);
  } finally {
    await fixture.close();
  }
});
