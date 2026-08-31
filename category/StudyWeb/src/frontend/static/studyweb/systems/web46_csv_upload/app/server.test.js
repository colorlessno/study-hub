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

async function upload(filename, content, type = 'text/csv') {
  const formData = new FormData();
  formData.append('file', new Blob([content], { type }), filename);
  return fetch(`${baseUrl}/api/csv/validate`, { method: 'POST', body: formData });
}

test('multipartで送ったCSVをサーバーで検証する', async () => {
  const response = await upload('items.csv', 'code,name,price\nA001,商品A,1200\nA002,商品B,abc\n');
  const body = await response.json();

  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.successCount, 1);
  assert.equal(body.failedCount, 1);
  assert.match(body.errors[0], /price/);
});

test('CSV以外の拡張子を拒否する', async () => {
  const response = await upload('items.txt', 'code,name,price\nA001,商品A,1200\n', 'text/plain');
  assert.equal(response.status, 400);
});

test('引用符内のカンマを一つの値としてpreviewへ返す', async () => {
  const response = await upload('items.csv', 'code,name,price\nA001,"商品, A",1200\n');
  const body = await response.json();

  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.successCount, 1);
  assert.equal(body.failedCount, 0);
  assert.equal(body.preview[0].name, '商品, A');
});

test('必須列不足を行データと分けて報告する', async () => {
  const response = await upload('items.csv', 'code,name\nA001,商品A\n');
  const body = await response.json();

  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.failedCount, 1);
  assert.ok(body.errors.some((message) => message.includes('必須列 price')));
});

test('UTF-8でないCSVを拒否する', async () => {
  const response = await upload('items.csv', new Uint8Array([0xff, 0xfe, 0x00]));
  assert.equal(response.status, 400);
});

test('512KiBを超えるCSVを拒否する', async () => {
  const response = await upload('items.csv', new Uint8Array(512 * 1024 + 1));
  assert.equal(response.status, 413);
});
