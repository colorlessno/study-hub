import { describe, expect, it } from 'vitest';
import {
  displaysRuntimeState,
  groupThemesForShelves,
  integrationModeLabels,
  lifecycleLabels,
  matchesThemeFilter,
  presentationLabels,
  themeInteractionLabel,
  themePreparationLabel
} from './catalogPresentation';
import type { ThemeSummary } from '../../shared/catalog';

const theme: ThemeSummary = {
  id: 'web13',
  fieldId: 'study-web',
  name: 'NestJS API',
  summary: 'NestJSでAPIを動かします。',
  presentation: 'request',
  lifecycle: 'process',
  integrationMode: 'request',
  runtimeState: 'stopped',
  operationCount: 4,
  environment: ['Node.js', 'テーマの依存パッケージ'],
  group: {
    id: 'web-api-database',
    name: 'API・データベース・画面連携',
    summary: 'APIと画面を連携します。',
    order: 30
  }
};

describe('カタログの表示情報', () => {
  it('内部値を日本語の表示名へ変換する', () => {
    expect(presentationLabels.request).toBe('APIリクエスト');
    expect(lifecycleLabels.process).toBe('単一処理');
    expect(lifecycleLabels.stack).toBe('順次処理');
    expect(integrationModeLabels.request).toBe('API操作');
  });

  it('番号・説明・日本語の実行方法でテーマを検索する', () => {
    expect(matchesThemeFilter(theme, 'web13')).toBe(true);
    expect(matchesThemeFilter(theme, 'NestJSでAPI')).toBe(true);
    expect(matchesThemeFilter(theme, '単一処理')).toBe(true);
    expect(matchesThemeFilter(theme, 'Node.js')).toBe(true);
    expect(matchesThemeFilter(theme, 'データベース')).toBe(true);
    expect(matchesThemeFilter(theme, '外部アプリ')).toBe(false);
  });

  it('カタログのグループ順でテーマを棚へまとめる', () => {
    const frontendTheme: ThemeSummary = {
      ...theme,
      id: 'web07',
      group: {
        id: 'web-frontend-ui',
        name: 'ReactとフロントエンドUI',
        summary: 'Reactを扱います。',
        order: 20
      }
    };
    const shelves = groupThemesForShelves([theme, frontendTheme]);

    expect(shelves.map((shelf) => shelf.id)).toEqual(['web-frontend-ui', 'web-api-database']);
    expect(shelves[0]?.themes.map((item) => item.id)).toEqual(['web07']);
  });

  it('テーマの表示方法と必要環境から準備条件を表示する', () => {
    expect(themePreparationLabel(theme)).toBe('Node.js');
    expect(themePreparationLabel({ ...theme, presentation: 'document' })).toBe('文書');
    expect(themePreparationLabel({ ...theme, lifecycle: 'none' })).toBe('起動不要');
    expect(themePreparationLabel({ ...theme, environment: ['Docker Desktop'] })).toBe('Docker');
  });

  it('操作数と一覧プロファイルから確認方法を表示する', () => {
    expect(themeInteractionLabel(theme)).toBe('複数要求');
    expect(themeInteractionLabel({ ...theme, operationCount: 1 })).toBe('単一要求');
    expect(themeInteractionLabel({
      ...theme,
      listProfile: {
        interactionMode: 'stateful-sequence',
        initialization: '最初に状態をリセット'
      }
    })).toBe('状態を引き継ぐ複数操作');
    expect(matchesThemeFilter({
      ...theme,
      listProfile: {
        interactionMode: 'stateful-sequence',
        initialization: '最初に状態をリセット',
        environmentScope: 'テーマ専用のDocker DB',
        cleanupImpact: '停止時にDBボリュームを削除'
      }
    }, '状態をリセット')).toBe(true);
    expect(matchesThemeFilter({
      ...theme,
      listProfile: {
        interactionMode: 'stateful-sequence',
        initialization: '最初に状態をリセット',
        environmentScope: 'テーマ専用のDocker DB',
        cleanupImpact: '停止時にDBボリュームを削除',
        relationshipNote: '正規テーマはarch02'
      }
    }, 'DBボリューム')).toBe(true);
    expect(matchesThemeFilter({
      ...theme,
      listProfile: {
        interactionMode: 'screen-operation',
        relationshipNote: '正規テーマはarch02',
        outputNote: 'リリース判定記録'
      }
    }, 'arch02')).toBe(true);
    expect(matchesThemeFilter({
      ...theme,
      listProfile: {
        interactionMode: 'screen-operation',
        outputNote: '見積り根拠・リスク一覧'
      }
    }, 'リスク一覧')).toBe(true);
  });

  it('継続して動くテーマだけ実行状態を一覧に表示する', () => {
    expect(displaysRuntimeState(theme)).toBe(true);
    expect(displaysRuntimeState({ ...theme, lifecycle: 'one-shot' })).toBe(false);
    expect(displaysRuntimeState({ ...theme, lifecycle: 'none' })).toBe(false);
  });
});
