import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  getFieldReadme,
  getTheme,
  getThemeResource,
  inspectFieldReadiness,
  runFieldCheck
} from './client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('APIクライアント', () => {
  it('APIのHTTP状態とエラーコードを保持する', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      error: {
        code: 'THEME_NOT_FOUND',
        message: 'テーマが見つかりません。'
      }
    }), {
      status: 404,
      headers: { 'content-type': 'application/json' }
    })));

    await expect(getTheme('not-found', 'actual')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      code: 'THEME_NOT_FOUND',
      message: 'テーマが見つかりません。'
    } satisfies Partial<ApiError>);
  });

  it('JSONではない成功応答を不正な応答として扱う', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not-json', { status: 200 })));

    await expect(getTheme('web01', 'actual')).rejects.toMatchObject({
      status: 200,
      code: 'INVALID_RESPONSE'
    } satisfies Partial<ApiError>);
  });

  it('テーマと関連ファイルのIDをURL用に変換して取得する', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: {
        resource: {
          id: 'readme-example',
          label: 'README記入例',
          kind: 'template',
          format: 'markdown',
          path: 'category/example.md',
          content: '# 記入例'
        }
      }
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getThemeResource('web/29', 'readme example', 'actual')).resolves.toMatchObject({
      id: 'readme-example',
      content: '# 記入例'
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/themes/web%2F29/resources/readme%20example?catalog=actual',
      undefined
    );
  });

  it('分野IDをURL用に変換してREADMEを取得する', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: {
        format: 'markdown',
        entryFile: 'category/StudyAI/README.md',
        content: '# StudyAI'
      }
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getFieldReadme('study ai', 'actual')).resolves.toMatchObject({
      entryFile: 'category/StudyAI/README.md',
      content: '# StudyAI'
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/fields/study%20ai/readme?catalog=actual',
      undefined
    );
  });

  it('分野IDをURL用に変換して検証を実行する', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: {
        report: {
          result: { ok: true, exitCode: 0, output: 'ok' },
          logs: []
        }
      }
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(runFieldCheck('study ai', 'actual')).resolves.toMatchObject({
      result: { ok: true, exitCode: 0 }
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/fields/study%20ai/check?catalog=actual',
      { method: 'POST' }
    );
  });

  it('分野IDをURL用に変換して準備状態を確認する', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: {
        report: {
          fieldId: 'study ai',
          checkedAt: '2026-08-25T00:00:00.000Z',
          ready: true,
          items: [{ id: 'node', label: 'Node.js', status: 'ready', message: 'v22' }]
        }
      }
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(inspectFieldReadiness('study ai', 'actual')).resolves.toMatchObject({ ready: true });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/fields/study%20ai/readiness?catalog=actual',
      { method: 'POST' }
    );
  });
});
