import { describe, expect, it } from 'vitest';
import { formatRunResult } from './runResultPresentation';

describe('実行結果の表示', () => {
  it('コマンドの改行を保ったまま処理ごとに表示する', () => {
    expect(formatRunResult({
      ok: true,
      exitCode: 0,
      output: [{ id: 'query', ok: true, exitCode: 0, output: '1行目\n2行目' }]
    })).toBe('[query] 成功（終了コード: 0）\n1行目\n2行目');
  });

  it('APIの応答は共通情報を含むJSONとして表示する', () => {
    expect(formatRunResult({ ok: true, statusCode: 200, output: { value: 1 } }))
      .toContain('"statusCode": 200');
  });
});
