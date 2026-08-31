import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const bundlePath = new URL('../app/bundle/main.js', import.meta.url);

test('ルートmoduleを一件ずつ順番に読み込むbundleを配布する', async () => {
  const bundle = await readFile(bundlePath, 'utf8');

  const forbiddenPromiseMethod = 'Promise' + '.all';
  assert.equal(bundle.includes(forbiddenPromiseMethod), false);
  assert.equal(bundle.includes('for (const match of matches)'), true);
  assert.equal(bundle.includes('await loadRouteModule(route, routeModules)'), true);
});
