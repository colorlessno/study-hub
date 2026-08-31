import test from 'node:test';
import assert from 'node:assert/strict';
import { createErrorRecord } from '../app/src/errorLog.js';

test('開発者向けログへ例外名、メッセージ、component stackを残す', () => {
  assert.deepEqual(createErrorRecord(new TypeError('想定エラー'), '\n  at ProtectedPanel'), {
    name: 'TypeError',
    message: '想定エラー',
    componentStack: 'at ProtectedPanel'
  });
});

test('Error以外の値もログ用文字列へ変換する', () => {
  assert.equal(createErrorRecord('失敗').message, '失敗');
});
