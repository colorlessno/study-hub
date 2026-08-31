const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { createAppServer } = require('./server.js');

let server;
let baseUrl;

before(async () => {
  server = createAppServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test('同じ版を二重更新すると後の要求をHTTP 409で拒否する', async () => {
  await fetch(`${baseUrl}/api/reset`, { method: 'POST' });
  const original = await (await fetch(`${baseUrl}/api/record`)).json();
  const request = (name) => fetch(`${baseUrl}/api/record`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, version: original.version }),
  });

  const first = await request('先に保存した値');
  const conflict = await request('後から保存した値');
  const conflictBody = await conflict.json();

  assert.equal(first.status, 200);
  assert.equal(conflict.status, 409);
  assert.equal(conflictBody.code, 'VERSION_CONFLICT');
  assert.equal(conflictBody.current.name, '先に保存した値');
});
