import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createReviewServer } from '../app/server.js';

async function startFixture() {
  const directory = await mkdtemp(path.join(tmpdir(), 'arch02-test-'));
  const { server } = createReviewServer({ databasePath: path.join(directory, 'arch02.sqlite') });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise((resolve) => server.close(resolve));
      await rm(directory, { recursive: true, force: true });
    }
  };
}

test('期待仕様と実際の状態コード差を実行証拠として取得できる', async () => {
  const fixture = await startFixture();
  try {
    const scope = await fetch(`${fixture.baseUrl}/api/review-scope`).then((response) => response.json());
    assert.equal(scope.expected.createTaskStatus, 201);

    const response = await fetch(`${fixture.baseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '証拠取得' })
    });
    assert.equal(response.status, 202);
    const created = await response.json();

    const tasks = await fetch(`${fixture.baseUrl}/api/tasks`).then((value) => value.json());
    assert.equal(tasks.tasks[0].title, '証拠取得');
    const logs = await fetch(`${fixture.baseUrl}/api/logs`).then((value) => value.json());
    assert.ok(logs.logs.some((log) => log.traceId === created.traceId && log.statusCode === 202));
  } finally {
    await fixture.close();
  }
});

test('発見事項と残リスクをSQLiteへ保存できる', async () => {
  const fixture = await startFixture();
  try {
    const review = {
      evidenceType: 'API応答',
      finding: '期待201に対して実際は202',
      impact: '成功判定が一致しない可能性',
      fixCandidate: '設計または実装を統一',
      status: '未対応',
      residualRisk: '利用側の期待値を要確認'
    };
    const response = await fetch(`${fixture.baseUrl}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review)
    });
    assert.equal(response.status, 201);

    const reviews = await fetch(`${fixture.baseUrl}/api/reviews`).then((value) => value.json());
    assert.deepEqual(reviews.reviews[0].finding, review.finding);
    assert.deepEqual(reviews.reviews[0].residualRisk, review.residualRisk);
  } finally {
    await fixture.close();
  }
});

test('定義されていないレビュー状態を拒否する', async () => {
  const fixture = await startFixture();
  try {
    const response = await fetch(`${fixture.baseUrl}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evidenceType: 'API応答',
        finding: '状態値の確認',
        impact: '分類不能になる',
        fixCandidate: '定義済み状態を使う',
        status: '不明',
        residualRisk: 'なし'
      })
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error, 'REVIEW_STATUS_INVALID');
  } finally {
    await fixture.close();
  }
});
