import { describe, expect, it } from 'vitest';
import { createApiErrorPresentation } from './apiErrorPresentation';

describe('APIエラーの表示先', () => {
  it('入力エラーを項目別表示へ割り当てる', () => {
    expect(createApiErrorPresentation({
      error: {
        code: 'VALIDATION_ERROR',
        message: '入力内容を確認してください',
        details: [{ field: 'name', message: '必須です' }],
        requestId: 'req_1'
      }
    })).toEqual({
      code: 'VALIDATION_ERROR',
      message: '入力内容を確認してください',
      requestId: 'req_1',
      destination: '入力項目の近く',
      fieldErrors: [{ field: 'name', message: '必須です' }]
    });
  });

  it('業務エラーと内部エラーを別の表示先へ割り当てる', () => {
    expect(createApiErrorPresentation({
      error: { code: 'ORDER_ALREADY_CLOSED', message: '変更できません', details: [] }
    })?.destination).toBe('フォームまたは画面の上部');
    expect(createApiErrorPresentation({
      error: { code: 'INTERNAL_ERROR', message: '再実行してください', details: [] }
    })?.destination).toBe('共通の通知欄');
  });

  it('正常応答はエラー表示へ割り当てない', () => {
    expect(createApiErrorPresentation({ ok: true })).toBeUndefined();
  });
});
