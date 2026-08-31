import test from 'node:test';
import assert from 'node:assert/strict';
import { createItem, deleteItem, initialItems, updateItem } from '../app/src/items.js';

test('新しい項目を次のIDで登録する', () => {
  assert.deepEqual(createItem(initialItems, 'Gamma'), [...initialItems, { id: 3, name: 'Gamma' }]);
});

test('指定した項目の名前を更新する', () => {
  assert.equal(updateItem(initialItems, 2, 'Beta updated')[1].name, 'Beta updated');
});

test('指定した項目だけを削除する', () => {
  assert.deepEqual(deleteItem(initialItems, 1), [{ id: 2, name: 'Beta' }]);
});

test('空の名前では登録・更新しない', () => {
  assert.equal(createItem(initialItems, '  '), initialItems);
  assert.equal(updateItem(initialItems, 1, ''), initialItems);
});
