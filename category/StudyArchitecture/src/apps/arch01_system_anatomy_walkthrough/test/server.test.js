import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createArchitectureServer } from '../app/server.js';

async function startFixture() {
  const directory = await mkdtemp(path.join(tmpdir(), 'arch01-test-'));
  const { server } = createArchitectureServer({ databasePath: path.join(directory, 'arch01.sqlite') });
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

test('画面から送った注文をSQLiteへ保存しログで追跡できる', async () => {
  const fixture = await startFixture();
  try {
    const createResponse = await fetch(`${fixture.baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '構成確認' })
    });
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json();
    assert.match(created.traceId, /^arch01-/);

    const list = await fetch(`${fixture.baseUrl}/api/orders`).then((response) => response.json());
    assert.equal(list.orders[0].title, '構成確認');

    const logs = await fetch(`${fixture.baseUrl}/api/logs`).then((response) => response.json());
    assert.ok(logs.logs.some((log) => log.traceId === created.traceId && log.statusCode === 201));
  } finally {
    await fixture.close();
  }
});

test('障害発生、保存失敗、復旧を実際のAPIで確認できる', async () => {
  const fixture = await startFixture();
  try {
    await fetch(`${fixture.baseUrl}/api/failure-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true })
    });
    assert.equal((await fetch(`${fixture.baseUrl}/ready`)).status, 503);
    assert.equal((await fetch(`${fixture.baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '失敗する注文' })
    })).status, 503);

    await fetch(`${fixture.baseUrl}/api/failure-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false })
    });
    assert.equal((await fetch(`${fixture.baseUrl}/ready`)).status, 200);
  } finally {
    await fixture.close();
  }
});
