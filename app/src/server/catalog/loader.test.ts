import { describe, expect, it } from 'vitest';
import {
  loadActualCatalog as loadActualCatalogFromDisk,
  loadCatalog,
  readActualFieldReadme,
  readActualTextMaterial,
  readActualThemeReadme,
  readThemeResource
} from './loader.js';
import { createThemeScreenModel } from '../../shared/themeScreenModel.js';

let actualCatalogCache: ReturnType<typeof loadActualCatalogFromDisk> | undefined;

function loadActualCatalog(): ReturnType<typeof loadActualCatalogFromDisk> {
  actualCatalogCache ??= loadActualCatalogFromDisk();
  return actualCatalogCache;
}

const formalDocumentResourceIds = new Set(['requirements', 'basic-design', 'detailed-design']);

function themeSpecificResources<T extends { id: string }>(resources: T[] | undefined): T[] {
  return (resources ?? []).filter((resource) => !formalDocumentResourceIds.has(resource.id));
}

describe('疑似カタログ', () => {
  it('実データから確認した11通りの画面動作を一つずつ持つ', () => {
    const catalog = loadCatalog();
    const combinations = catalog.themes.map((theme) => `${theme.presentation}/${theme.lifecycle}`);

    expect(catalog.themes).toHaveLength(11);
    expect(new Set(combinations).size).toBe(11);
  });

  it('各テーマが存在する分野を参照する', () => {
    const catalog = loadCatalog();
    const fieldIds = new Set(catalog.fields.map((field) => field.id));

    for (const theme of catalog.themes) {
      expect(fieldIds.has(theme.fieldId)).toBe(true);
    }
  });

  it('疑似テーマにも実テーマと同じ学習進捗機能を使えるチェック設定を持つ', () => {
    const catalog = loadCatalog();
    const themeIds = catalog.themes.map((theme) => theme.id).sort();
    const checklistThemeIds = catalog.checklists.map((checklist) => checklist.themeId).sort();

    expect(checklistThemeIds).toEqual(themeIds);
    expect(catalog.checklists).toHaveLength(11);
    expect(catalog.checklists.every((checklist) => checklist.items.length > 0)).toBe(true);
    expect(catalog.checklists.every((checklist) => (
      catalog.themeById.get(checklist.themeId)?.fieldId === checklist.fieldId
    ))).toBe(true);
  });

  it('疑似テーマでも関連ファイルを安全に読み込む', () => {
    const theme = loadCatalog().themeById.get('sample-document');

    expect(theme?.resources).toMatchObject([
      { id: 'document-source', label: '文書表示のHTML', kind: 'source', format: 'source' }
    ]);
    expect(readThemeResource(theme!, 'document-source', 'sample').content)
      .toContain('<!doctype html>');
  });

  it('11通りの画面で表示する操作と結果を固定する', () => {
    const catalog = loadCatalog();
    const screenModels = Object.fromEntries(catalog.themes.map((theme) => [
      theme.id,
      createThemeScreenModel(theme)
    ]));

    expect(screenModels).toEqual({
      'sample-document': {
        showsRuntimeState: false,
        showsRuntimeControls: false,
        showsExternalAction: false,
        showsRun: false,
        showsEmbeddedMaterial: true,
        showsLogs: false,
        defaultContentView: 'material'
      },
      'sample-manual': {
        showsRuntimeState: true,
        showsRuntimeControls: false,
        showsExternalAction: true,
        showsRun: false,
        showsEmbeddedMaterial: false,
        showsLogs: false,
        defaultContentView: 'material'
      },
      'sample-static-web': {
        showsRuntimeState: false,
        showsRuntimeControls: false,
        showsExternalAction: false,
        showsRun: false,
        showsEmbeddedMaterial: true,
        showsLogs: false,
        defaultContentView: 'material'
      },
      'sample-web-process': {
        showsRuntimeState: true,
        showsRuntimeControls: true,
        showsExternalAction: false,
        showsRun: false,
        showsEmbeddedMaterial: true,
        showsLogs: true,
        defaultContentView: 'material'
      },
      'sample-web-stack': {
        showsRuntimeState: true,
        showsRuntimeControls: true,
        showsExternalAction: false,
        showsRun: false,
        showsEmbeddedMaterial: true,
        showsLogs: true,
        defaultContentView: 'material'
      },
      'sample-web-shared': {
        showsRuntimeState: true,
        showsRuntimeControls: true,
        showsExternalAction: false,
        showsRun: false,
        showsEmbeddedMaterial: true,
        showsLogs: true,
        defaultContentView: 'material'
      },
      'sample-request-process': {
        showsRuntimeState: true,
        showsRuntimeControls: true,
        showsExternalAction: false,
        showsRun: true,
        showsEmbeddedMaterial: false,
        showsLogs: true,
        defaultContentView: 'result'
      },
      'sample-request-stack': {
        showsRuntimeState: true,
        showsRuntimeControls: true,
        showsExternalAction: false,
        showsRun: true,
        showsEmbeddedMaterial: false,
        showsLogs: true,
        defaultContentView: 'result'
      },
      'sample-command': {
        showsRuntimeState: false,
        showsRuntimeControls: false,
        showsExternalAction: false,
        showsRun: true,
        showsEmbeddedMaterial: false,
        showsLogs: false,
        defaultContentView: 'result'
      },
      'sample-command-stack': {
        showsRuntimeState: true,
        showsRuntimeControls: true,
        showsExternalAction: false,
        showsRun: true,
        showsEmbeddedMaterial: false,
        showsLogs: true,
        defaultContentView: 'result'
      },
      'sample-desktop': {
        showsRuntimeState: true,
        showsRuntimeControls: true,
        showsExternalAction: true,
        showsRun: false,
        showsEmbeddedMaterial: false,
        showsLogs: true,
        defaultContentView: 'material'
      }
    });
  });
});

describe('実テーマカタログ', () => {
  it('番号付き163件と単独教材4件をすべて接続済みにする', () => {
    const catalog = loadActualCatalog();

    expect(catalog.mode).toBe('actual');
    expect(catalog.themes).toHaveLength(167);
    expect(catalog.themes.filter((theme) => theme.integrationStatus === 'connected')).toHaveLength(167);
    expect(catalog.themes.filter((theme) => theme.integrationStatus === 'metadata-only')).toHaveLength(0);
    expect(catalog.themes.filter((theme) => theme.actualConnection?.type === 'static-web')).toHaveLength(22);
    expect(catalog.themes.filter((theme) => theme.actualConnection?.type === 'web-process')).toHaveLength(19);
    expect(catalog.themes.filter((theme) => theme.actualConnection?.type === 'request-process')).toHaveLength(26);
    expect(catalog.themes.filter((theme) => theme.actualConnection?.type === 'request-stack')).toHaveLength(4);
    expect(catalog.themes.filter((theme) => theme.actualConnection?.type === 'command-one-shot')).toHaveLength(22);
    expect(catalog.themes.filter((theme) => theme.actualConnection?.type === 'command-stack')).toHaveLength(14);
    expect(catalog.themes.filter((theme) => theme.actualConnection?.type === 'web-stack')).toHaveLength(9);
    expect(catalog.themes.filter((theme) => theme.actualConnection?.type === 'web-shared')).toHaveLength(43);
    expect(catalog.themes.filter((theme) => theme.actualConnection?.type === 'external-process')).toHaveLength(1);
    expect(catalog.themes.filter((theme) => theme.integrationMode === 'embedded')).toHaveLength(93);
    expect(catalog.themes.filter((theme) => theme.integrationMode === 'request')).toHaveLength(30);
    expect(catalog.themes.filter((theme) => theme.integrationMode === 'command')).toHaveLength(36);
    expect(catalog.themes.filter((theme) => theme.integrationMode === 'document')).toHaveLength(7);
    expect(catalog.themes.filter((theme) => theme.integrationMode === 'external')).toHaveLength(1);
  });

  it('全167テーマの画面動作と起動種別を一致させる', () => {
    const expectedConnectionTypes = new Map([
      ['document/none', 'markdown'],
      ['web/none', 'static-web'],
      ['web/process', 'web-process'],
      ['web/stack', 'web-stack'],
      ['web/shared', 'web-shared'],
      ['request/process', 'request-process'],
      ['request/stack', 'request-stack'],
      ['command/one-shot', 'command-one-shot'],
      ['command/stack', 'command-stack'],
      ['external-app/process', 'external-process']
    ]);

    for (const theme of loadActualCatalog().themes) {
      const behavior = `${theme.presentation}/${theme.lifecycle}`;
      expect(theme.actualConnection?.type, theme.id).toBe(expectedConnectionTypes.get(behavior));
    }
  });

  it('StudyWebの52テーマを学習内容ごとの7グループへ分類する', () => {
    const themes = loadActualCatalog().themes.filter((theme) => theme.fieldId === 'study-web');
    const groupCounts = new Map<string, number>();
    for (const theme of themes) {
      expect(theme.group).toBeDefined();
      groupCounts.set(theme.group!.id, (groupCounts.get(theme.group!.id) ?? 0) + 1);
    }

    expect(themes).toHaveLength(52);
    expect([...groupCounts]).toEqual([
      ['web-foundations', 6],
      ['web-frontend-ui', 6],
      ['web-api-database', 10],
      ['web-nextjs', 3],
      ['web-deployment-environment', 3],
      ['web-learning-records', 3],
      ['web-practical-behavior', 21]
    ]);
  });

  it('StudySecurityの21テーマを4グループへ分類し、状態引継ぎを明示する', () => {
    const catalog = loadActualCatalog();
    const themes = catalog.themes.filter((theme) => theme.fieldId === 'study-security');
    const groupCounts = new Map<string, number>();
    for (const theme of themes) {
      expect(theme.group).toBeDefined();
      groupCounts.set(theme.group!.id, (groupCounts.get(theme.group!.id) ?? 0) + 1);
    }

    expect(themes).toHaveLength(21);
    expect([...groupCounts]).toEqual([
      ['security-auth-authorization', 4],
      ['security-input-browser-secrets', 6],
      ['security-integration-operation', 6],
      ['security-ai-data', 5]
    ]);
    expect(catalog.themeById.get('security01')?.listProfile).toEqual({
      interactionMode: 'stateful-sequence',
      initialization: '起動時にSessionを初期化'
    });
    expect(catalog.themeById.get('security07')?.listProfile?.interactionMode).toBe('stateful-sequence');
    expect(catalog.themeById.get('security11')?.listProfile?.interactionMode).toBe('stateful-sequence');
    expect(catalog.themeById.get('security13')?.listProfile?.interactionMode).toBe('stateful-sequence');
  });

  it('StudyDBの7テーマを3グループへ分類し、専用Docker環境と停止時の影響を明示する', () => {
    const catalog = loadActualCatalog();
    const themes = catalog.themes.filter((theme) => theme.fieldId === 'study-db');
    const groupCounts = new Map<string, number>();
    for (const theme of themes) {
      expect(theme.group).toBeDefined();
      groupCounts.set(theme.group!.id, (groupCounts.get(theme.group!.id) ?? 0) + 1);
    }

    expect(themes).toHaveLength(7);
    expect([...groupCounts]).toEqual([
      ['db-foundation-modeling', 3],
      ['db-sql-consistency-performance', 3],
      ['db-operation-change-recovery', 1]
    ]);
    expect(catalog.themeById.get('db02')?.listProfile).toEqual({
      interactionMode: 'stateful-sequence',
      initialization: '最初にスキーマと初期データを準備',
      environmentScope: 'db02専用のDocker DB',
      cleanupImpact: '停止時にdb02のDBコンテナとボリュームを削除'
    });
    expect(catalog.themeById.get('db01')?.listProfile).toBeUndefined();
    expect(catalog.themeById.get('db04')?.listProfile?.environmentScope).toBe('db04専用のDocker DB');
    expect(catalog.themeById.get('db05')?.listProfile?.environmentScope).toBe('db05専用のDocker DB');
    expect(catalog.themeById.get('db06')?.listProfile?.environmentScope).toBe('db06専用のDocker DB');
  });

  it('StudyAWSの10テーマを5グループへ分類し、実AWSを使わない確認範囲を明示する', () => {
    const catalog = loadActualCatalog();
    const themes = catalog.themes.filter((theme) => theme.fieldId === 'study-aws');
    const groupCounts = new Map<string, number>();
    for (const theme of themes) {
      expect(theme.group).toBeDefined();
      expect(theme.listProfile?.environmentScope).toBeDefined();
      groupCounts.set(theme.group!.id, (groupCounts.get(theme.group!.id) ?? 0) + 1);
    }

    expect(themes).toHaveLength(10);
    expect([...groupCounts]).toEqual([
      ['aws-permission-network', 2],
      ['aws-compute-database-config', 2],
      ['aws-storage-observability', 2],
      ['aws-serverless-api', 2],
      ['aws-deploy-recovery', 2]
    ]);
    expect(catalog.themeById.get('aws03')?.listProfile).toEqual({
      interactionMode: 'stateful-sequence',
      initialization: '起動時に疑似サーバーを作成',
      environmentScope: 'ローカルDockerコンテナ（実EC2不使用）',
      cleanupImpact: '停止時にaws03のコンテナを削除'
    });
    expect(catalog.themeById.get('aws09')?.listProfile?.interactionMode).toBe('stateful-sequence');
    expect(themes.every((theme) => theme.listProfile?.environmentScope?.includes('実'))).toBe(true);
  });

  it('StudyDevOpsの10テーマを3グループへ分類し、実行場所と後片付け範囲を明示する', () => {
    const catalog = loadActualCatalog();
    const themes = catalog.themes.filter((theme) => theme.fieldId === 'study-devops');
    const groupCounts = new Map<string, number>();
    for (const theme of themes) {
      expect(theme.group).toBeDefined();
      expect(theme.listProfile?.environmentScope).toBeDefined();
      groupCounts.set(theme.group!.id, (groupCounts.get(theme.group!.id) ?? 0) + 1);
    }

    expect(themes).toHaveLength(10);
    expect([...groupCounts]).toEqual([
      ['devops-ci-automated-test', 5],
      ['devops-observability-incident', 3],
      ['devops-operation-record-release', 2]
    ]);
    expect(catalog.themeById.get('devops03')?.listProfile).toEqual({
      interactionMode: 'stateful-sequence',
      initialization: '最初にWeb APIコンテナを起動',
      environmentScope: 'devops03専用Docker環境',
      cleanupImpact: '停止時にdevops03のコンテナと関連ボリュームを削除'
    });
    expect(catalog.themeById.get('devops07')?.listProfile?.interactionMode).toBe('stateful-sequence');
    expect(catalog.themeById.get('devops10')?.listProfile?.relationshipNote)
      .toBe('arch02は設計レビュー、devops10はリリース直前の運用判定を扱う独立テーマ');
  });

  it('StudyBaseの12テーマを4グループへ分類し、成果物と重複する正規テーマを明示する', () => {
    const catalog = loadActualCatalog();
    const themes = catalog.themes.filter((theme) => theme.fieldId === 'study-base');
    const groupCounts = new Map<string, number>();
    for (const theme of themes) {
      expect(theme.group).toBeDefined();
      expect(theme.listProfile?.environmentScope).toBeDefined();
      groupCounts.set(theme.group!.id, (groupCounts.get(theme.group!.id) ?? 0) + 1);
    }

    expect(themes).toHaveLength(12);
    expect([...groupCounts]).toEqual([
      ['base-upstream-management-documents', 5],
      ['base-git-workflow', 3],
      ['base-local-tools', 2],
      ['base-explanation-structure', 2]
    ]);
    expect(catalog.themeById.get('base01')?.listProfile?.outputNote)
      .toBe('ヒアリングメモ・要件定義入力メモ');
    expect(catalog.themeById.get('base08')?.listProfile).toEqual({
      interactionMode: 'stateful-sequence',
      initialization: '最初にローカルGiteaを起動',
      environmentScope: 'base08専用Docker Gitea',
      cleanupImpact: '停止時にGiteaコンテナを削除（データ用ボリュームは保持）',
      outputNote: 'Issue・Pull Request・マージ・同期結果'
    });
    expect(catalog.themeById.get('base12')?.listProfile?.relationshipNote)
      .toBe('正規テーマはarch01（StudyArchitecture）');
  });

  it('StudyArchitectureを構成理解と設計レビューへ分類し、成果物と参照元を明示する', () => {
    const catalog = loadActualCatalog();
    const themes = catalog.themes.filter((theme) => theme.fieldId === 'study-architecture');

    expect(themes).toHaveLength(2);
    expect(themes.map((theme) => [theme.id, theme.group?.id])).toEqual([
      ['arch01', 'architecture-system-understanding'],
      ['arch02', 'architecture-design-review']
    ]);
    expect(catalog.themeById.get('arch01')?.listProfile).toEqual({
      interactionMode: 'stateful-sequence',
      initialization: 'arch01専用のNode.jsサーバーとSQLiteを起動',
      environmentScope: 'arch01専用Node.js・SQLite実行環境',
      cleanupImpact: '停止時にarch01のNode.jsサーバーだけを停止',
      outputNote: 'SQLite保存結果・処理ログ・障害と復旧の確認結果・構成判断メモ'
    });
    expect(catalog.themeById.get('arch02')?.listProfile).toEqual({
      interactionMode: 'stateful-sequence',
      initialization: 'arch02専用のレビュー対象サーバーとSQLiteを起動',
      environmentScope: 'arch02専用Node.js・SQLite実行環境',
      cleanupImpact: '停止時にarch02のNode.jsサーバーだけを停止',
      outputNote: '画面・API・DB・ログ・ヘルスの証拠とSQLiteへ保存したレビュー結果'
    });
  });

  it('StudyDesktopを外部Electronアプリとして分類し、手動準備と停止範囲を明示する', () => {
    const catalog = loadActualCatalog();
    const theme = catalog.themeById.get('desktop01');

    expect(theme?.group).toEqual(expect.objectContaining({
      id: 'desktop-electron-automation',
      order: 10
    }));
    expect(theme?.listProfile).toEqual({
      interactionMode: 'stateful-sequence',
      initialization: '初回のみテーマフォルダでnpm ciとnpm run setup:electronを手動実行',
      environmentScope: 'ローカルNode.jsとElectronのデスクトップセッション',
      cleanupImpact: '停止時に起動中のElectronアプリを終了',
      outputNote: '画面の状態遷移・実行ログ・一時作業フォルダの後片付け結果'
    });
  });

  it('StudyIdeaForgeを保存と任意のLLM連携を持つアプリとして分類する', () => {
    const catalog = loadActualCatalog();
    const theme = catalog.themeById.get('study-idea-forge');

    expect(theme?.group).toEqual(expect.objectContaining({
      id: 'idea-forge-workflow-application',
      order: 10
    }));
    expect(theme?.listProfile).toEqual({
      interactionMode: 'stateful-sequence',
      initialization: '最初にテーマのPython仮想環境を準備。LLMなしで画面と保存を確認可能',
      environmentScope: 'テーマのPython仮想環境とSQLite。LLM使用時のみLM Studio（127.0.0.1:5858/v1）',
      cleanupImpact: '停止時にIdeaForgeのFastAPIを終了（SQLiteデータは保持）',
      outputNote: '発想手順・セッション状態・生成レポート'
    });
  });

  it('StudyAIIdeaGenerationを構造確認と実生成を分けた比較演習として分類する', () => {
    const catalog = loadActualCatalog();
    const theme = catalog.themeById.get('study-ai-idea-generation');

    expect(theme?.group).toEqual(expect.objectContaining({
      id: 'ai-idea-method-comparison',
      order: 10
    }));
    expect(theme?.listProfile).toEqual({
      interactionMode: 'multiple-actions',
      initialization: '構造確認と単体テストはLM Studio不要。接続確認・実生成前に127.0.0.1:5858/v1を起動',
      environmentScope: 'ローカルPython。接続確認・実生成時のみLM Studio',
      cleanupImpact: '各コマンドは完了時に終了（LM StudioはStudyHubから停止しない）',
      relationshipNote: 'StudyAIの生成AI実験を、5つの発想法の比較演習で補完',
      outputNote: '基準条件・変更条件の生成結果と比較表'
    });
  });

  it('StudyAICorporateEmployeeを設定検証と実応答比較を分けた権限演習として分類する', () => {
    const catalog = loadActualCatalog();
    const theme = catalog.themeById.get('study-ai-corporate-employee');

    expect(theme?.group).toEqual(expect.objectContaining({
      id: 'ai-corporate-role-permission-evaluation',
      order: 10
    }));
    expect(theme?.listProfile).toEqual({
      interactionMode: 'multiple-actions',
      initialization: '設定検証と単体テストはClaude Code不要。実応答を比較するときだけ各役割フォルダでClaude Codeを起動',
      environmentScope: 'ローカルPython。実応答の比較時のみClaude Code',
      cleanupImpact: '各Pythonコマンドは完了時に終了（Claude CodeはStudyHubから停止しない）',
      relationshipNote: 'StudyAIの業務支援・エージェント学習を、役割・権限境界・評価の演習で補完',
      outputNote: '役割別の回答・確認・人間への引き継ぎ・拒否結果と評価表'
    });
  });

  it('StudyAPIをHTTP状態確認と任意のLM Studio中継を持つAPI教材として分類する', () => {
    const catalog = loadActualCatalog();
    const theme = catalog.themeById.get('study-api');

    expect(theme?.group).toEqual(expect.objectContaining({
      id: 'python-http-status-and-upstream',
      order: 10
    }));
    expect(theme?.listProfile).toEqual({
      interactionMode: 'multiple-actions',
      initialization: '204・200・400・404・405・413・415・502の確認はLM Studio不要。POST /askの正常中継時だけ127.0.0.1:5858を起動',
      environmentScope: 'ローカルPython。正常なLLM中継時のみLM Studio',
      cleanupImpact: '停止時にStudyAPIのHTTPサーバーを終了（LM StudioはStudyHubから停止しない）',
      relationshipNote: 'StudyWebのNestJS・API教材を、Python標準ライブラリ実装と入力制限の確認で補完',
      outputNote: '204・200・400・404・405・413・415・502の状態、応答ヘッダー、JSON本文'
    });
    expect(theme?.operations.run).toMatchObject({
      requests: expect.arrayContaining([
        expect.objectContaining({ id: 'invalid-json', body: '{bad json}' }),
        expect.objectContaining({ id: 'json-array', body: '[]' }),
        expect.objectContaining({ id: 'prompt-too-large' }),
        expect.objectContaining({ id: 'upstream-unavailable' })
      ])
    });
  });

  it('StudyAIの48テーマを8グループへ分類し、分類単位の実行環境を各テーマへ継承する', () => {
    const catalog = loadActualCatalog();
    const themes = catalog.themes.filter((theme) => theme.fieldId === 'study-ai');
    const groupCounts = new Map<string, number>();
    for (const theme of themes) {
      expect(theme.group).toBeDefined();
      expect(theme.listProfile?.environmentScope).toBeDefined();
      groupCounts.set(theme.group!.id, (groupCounts.get(theme.group!.id) ?? 0) + 1);
    }

    expect(themes).toHaveLength(48);
    expect([...groupCounts]).toEqual([
      ['ai-document-information', 6],
      ['ai-work-assistance-agents', 9],
      ['ai-ebook-integration-plan', 1],
      ['ai-foundation-experiments', 5],
      ['ai-retrieval-document-experiments', 9],
      ['ai-evaluation-observability', 6],
      ['ai-business-applications', 8],
      ['ai-development-operations', 4]
    ]);
    expect(catalog.themeById.get('system01')?.listProfile).toEqual({
      interactionMode: 'stateful-sequence',
      initialization: '初回起動時に共有DBを起動してmigrationを実行',
      environmentScope: 'StudyAI共有Docker環境（actual-study-ai-shared）',
      cleanupImpact: '停止時に共有環境を停止（他のStudyAIテーマにも影響、DBボリュームは保持）'
    });
    expect(catalog.themeById.get('system15')?.listProfile).toEqual({
      interactionMode: 'stateful-sequence',
      initialization: 'book_summarization_cliのPython環境とローカル連携サービスを使用',
      environmentScope: 'ローカルNode.js・Python・LM Studio・Tesseract OCR',
      cleanupImpact: '連携サービスを停止しても、CLIが保存したジョブ成果物は保持'
    });
    expect(catalog.themeById.get('system45')?.listProfile).toEqual({
      interactionMode: 'multiple-actions',
      environmentScope: 'ローカルNode.js（テーマ固有のコマンド実行）'
    });
  });

  it('単独教材4件を実際の操作方法へ接続する', () => {
    const catalog = loadActualCatalog();

    expect(catalog.themeById.get('study-idea-forge')).toMatchObject({
      integrationMode: 'embedded',
      actualConnection: { type: 'web-process', command: 'python-venv' }
    });
    expect(catalog.themeById.get('study-ai-idea-generation')).toMatchObject({
      integrationMode: 'command',
      actualConnection: { type: 'command-one-shot' }
    });
    expect(catalog.themeById.get('study-ai-corporate-employee')).toMatchObject({
      integrationMode: 'command',
      actualConnection: { type: 'command-one-shot' }
    });
    expect(catalog.themeById.get('study-api')).toMatchObject({
      integrationMode: 'request',
      actualConnection: { type: 'request-process', command: 'python' }
    });
  });

  it('すべての分野に一つ以上のテーマ入口を持つ', () => {
    const catalog = loadActualCatalog();

    for (const field of catalog.fields) {
      expect(field.themeCount, field.id).toBeGreaterThan(0);
    }
  });

  it('web01の学習項目をチェック設定から読み込む', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'web01');

    expect(checklist).toMatchObject({
      schemaVersion: 1,
      revision: 3,
      fieldId: 'study-web',
      title: '学習項目',
      items: [
        expect.objectContaining({ id: 'check-01' }),
        expect.objectContaining({ id: 'check-02' }),
        expect.objectContaining({ id: 'check-03' }),
        expect.objectContaining({ id: 'check-04' })
      ]
    });
  });

  it('全167テーマにチェック設定を持つ', () => {
    const catalog = loadActualCatalog();
    const themeIds = catalog.themes.map((theme) => theme.id).sort();
    const checklistThemeIds = catalog.checklists.map((checklist) => checklist.themeId).sort();

    expect(checklistThemeIds).toEqual(themeIds);
    expect(catalog.checklists).toHaveLength(167);
    expect(catalog.checklists.every((checklist) => checklist.items.length > 0)).toBe(true);
    expect(catalog.checklists.every((checklist) => (
      catalog.themeById.get(checklist.themeId)?.fieldId === checklist.fieldId
    ))).toBe(true);
  });

  it('web01の既存READMEをUTF-8で読み込む', () => {
    const theme = loadActualCatalog().themeById.get('web01');

    expect(theme).toBeDefined();
    expect(readActualThemeReadme(theme!).content).toContain('HTML、CSS、JavaScriptの役割分担');
  });

  it('実分野のREADMEをUTF-8で読み込む', () => {
    const field = loadActualCatalog().fields.find((item) => item.id === 'study-ai');

    expect(field?.entryFile).toBe('category/StudyAI/README.md');
    expect(field?.check).toEqual({
      command: 'python',
      args: ['category/StudyAI/scripts/validate-ai-learning.py'],
      timeoutSeconds: 120
    });
    expect(readActualFieldReadme(field!).content).toContain('# StudyAI');
  });

  it('番号付き163テーマの正式文書を関連ファイルとして読み込む', () => {
    const numberedThemes = loadActualCatalog().themes
      .filter((theme) => /^[a-z]+\d{2}$/u.test(theme.id));

    expect(numberedThemes).toHaveLength(163);
    for (const theme of numberedThemes) {
      expect(theme.resources).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'requirements', label: '要件定義', kind: 'requirements', format: 'markdown' }),
        expect.objectContaining({ id: 'basic-design', label: '基本設計', kind: 'design', format: 'markdown' }),
        expect.objectContaining({ id: 'detailed-design', label: '詳細設計', kind: 'design', format: 'markdown' })
      ]));
      expect(readThemeResource(theme, 'requirements', 'actual').content.length).toBeGreaterThan(0);
      expect(readThemeResource(theme, 'basic-design', 'actual').content.length).toBeGreaterThan(0);
      expect(readThemeResource(theme, 'detailed-design', 'actual').content.length).toBeGreaterThan(0);
    }
  });

  it('web29のREADMEひな形と記入例を関連ファイルとして読み込む', () => {
    const theme = loadActualCatalog().themeById.get('web29');

    expect(themeSpecificResources(theme?.resources)).toEqual([
      {
        id: 'readme-template',
        label: 'READMEひな形',
        kind: 'template',
        format: 'markdown',
        path: 'category/StudyWeb/doc/templates/web29_readme_template/README.template.md'
      },
      {
        id: 'readme-example',
        label: 'README記入例',
        kind: 'template',
        format: 'markdown',
        path: 'category/StudyWeb/doc/templates/web29_readme_template/README.example.md'
      }
    ]);
    expect(readThemeResource(theme!, 'readme-template', 'actual').content)
      .toContain('# <テーマID> <テーマ名>');
    expect(readThemeResource(theme!, 'readme-example', 'actual').content)
      .toContain('# web20_create_task_form');
    expect(createThemeScreenModel(theme!).defaultContentView).toBe('guide');
  });

  it('web29の学習項目をREADMEの作成手順と対応させる', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'web29');

    expect(checklist).toMatchObject({
      revision: 3,
      items: [
        expect.objectContaining({ label: expect.stringContaining('READMEひな形とREADME記入例') }),
        expect.objectContaining({ label: expect.stringContaining('目的・前提・実行方法・確認方法・終了方法') }),
        expect.objectContaining({ label: expect.stringContaining('教材を起動し、確認後に終了') }),
        expect.objectContaining({ label: expect.stringContaining('秘密情報や未確認の結果') })
      ]
    });
  });

  it('web30のエラー記録ひな形と記入例を関連ファイルとして読み込む', () => {
    const theme = loadActualCatalog().themeById.get('web30');

    expect(themeSpecificResources(theme?.resources)).toEqual([
      expect.objectContaining({ id: 'error-log-template', label: 'エラー記録ひな形' }),
      expect.objectContaining({ id: 'css-error-example', label: 'CSS読込エラー記入例' }),
      expect.objectContaining({ id: 'api-404-example', label: 'API 404記入例' })
    ]);
    expect(readThemeResource(theme!, 'error-log-template', 'actual').content)
      .toContain('## 調査中の予想');
    expect(readThemeResource(theme!, 'css-error-example', 'actual').content)
      .toContain('## 確認した事実');
    expect(readThemeResource(theme!, 'api-404-example', 'actual').content)
      .toContain('## 対応結果');
  });

  it('web30の学習項目をエラー記録の項目と対応させる', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'web30');

    expect(checklist).toMatchObject({
      revision: 3,
      items: [
        expect.objectContaining({ label: expect.stringContaining('エラー記録ひな形と2件の記入例') }),
        expect.objectContaining({ label: expect.stringContaining('環境、エラー原文、再現手順') }),
        expect.objectContaining({ label: expect.stringContaining('調査中の予想、確認した事実、確定した原因') }),
        expect.objectContaining({ label: expect.stringContaining('対応内容、対応結果、次回の確認箇所') }),
        expect.objectContaining({ label: expect.stringContaining('パスワード、トークン、Cookie、個人情報') })
      ]
    });
  });

  it('web31のIssue・PRひな形、記入例、Gitea演習案内を関連ファイルとして読み込む', () => {
    const theme = loadActualCatalog().themeById.get('web31');

    expect(themeSpecificResources(theme?.resources)).toEqual([
      expect.objectContaining({ id: 'issue-template', label: 'Issueひな形' }),
      expect.objectContaining({ id: 'pr-template', label: 'PRひな形' }),
      expect.objectContaining({ id: 'issue-example', label: 'Issue記入例' }),
      expect.objectContaining({ id: 'pr-example', label: 'PR記入例' }),
      expect.objectContaining({ id: 'gitea-practice-entry', label: 'Gitea演習案内' })
    ]);
    expect(readThemeResource(theme!, 'issue-template', 'actual').content)
      .toContain('## 確認方法');
    expect(readThemeResource(theme!, 'pr-template', 'actual').content)
      .toContain('## 未確認事項');
    expect(readThemeResource(theme!, 'gitea-practice-entry', 'actual').content)
      .toContain('テーマ番号: base08');
  });

  it('web31の学習項目をIssueとPRの記載項目に対応させる', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'web31');

    expect(checklist).toMatchObject({
      revision: 3,
      items: [
        expect.objectContaining({ label: expect.stringContaining('背景、目的、対象範囲、対象外、完了条件、確認方法') }),
        expect.objectContaining({ label: expect.stringContaining('関連Issue、変更内容、変更理由、影響範囲、確認結果') }),
        expect.objectContaining({ label: expect.stringContaining('対象外、未確認事項、今後の対応') }),
        expect.objectContaining({ label: expect.stringContaining('変更理由と再確認方法') }),
        expect.objectContaining({ label: expect.stringContaining('未確認事項を成功として記載していない') })
      ]
    });
  });

  it('web40の操作説明、ソース、設計文書を関連ファイルとして読み込む', () => {
    const theme = loadActualCatalog().themeById.get('web40');

    expect(theme?.resources).toEqual([
      expect.objectContaining({ id: 'table-state-guide', label: '一覧状態の説明' }),
      expect.objectContaining({ id: 'operation-check', label: '操作確認手順' }),
      expect.objectContaining({ id: 'html-source', label: 'HTML' }),
      expect.objectContaining({ id: 'javascript-source', label: 'JavaScript' }),
      expect.objectContaining({ id: 'table-state-source', label: '一覧計算' }),
      expect.objectContaining({ id: 'css-source', label: 'CSS' }),
      expect.objectContaining({ id: 'requirements', label: '要件定義' }),
      expect.objectContaining({ id: 'basic-design', label: '基本設計' }),
      expect.objectContaining({ id: 'detailed-design', label: '詳細設計' })
    ]);
    expect(readThemeResource(theme!, 'table-state-source', 'actual').content)
      .toContain('export function buildTableState');
    expect(readThemeResource(theme!, 'requirements', 'actual').content)
      .toContain('存在するページの範囲内だけ移動する');
  });

  it('web40の学習項目を一覧画面の操作と表示状態に対応させる', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'web40');

    expect(checklist).toMatchObject({
      revision: 3,
      items: [
        expect.objectContaining({ label: expect.stringContaining('17件中の1〜5件') }),
        expect.objectContaining({ label: expect.stringContaining('次のページ') }),
        expect.objectContaining({ label: expect.stringContaining('昇順と降順') }),
        expect.objectContaining({ label: expect.stringContaining('名前検索と対応状況') }),
        expect.objectContaining({ label: expect.stringContaining('検索結果なし') }),
        expect.objectContaining({ label: expect.stringContaining('読込中、読込エラー、通常表示') }),
        expect.objectContaining({ label: expect.stringContaining('範囲外ページ') })
      ]
    });
  });

  it('web47の検証説明、ソース、設計文書を関連ファイルとして読み込む', () => {
    const theme = loadActualCatalog().themeById.get('web47');

    expect(theme?.resources).toEqual([
      expect.objectContaining({ id: 'file-validation-guide', label: 'ファイル検証の説明' }),
      expect.objectContaining({ id: 'metadata-guide', label: 'ファイル情報の説明' }),
      expect.objectContaining({ id: 'html-source', label: 'HTML' }),
      expect.objectContaining({ id: 'javascript-source', label: 'JavaScript' }),
      expect.objectContaining({ id: 'validation-source', label: 'ファイル判定' }),
      expect.objectContaining({ id: 'css-source', label: 'CSS' }),
      expect.objectContaining({ id: 'requirements', label: '要件定義' }),
      expect.objectContaining({ id: 'basic-design', label: '基本設計' }),
      expect.objectContaining({ id: 'detailed-design', label: '詳細設計' })
    ]);
    expect(readThemeResource(theme!, 'validation-source', 'actual').content)
      .toContain('export function validateFileMetadata');
    expect(readThemeResource(theme!, 'requirements', 'actual').content)
      .toContain('複数の条件に該当した場合');
  });

  it('web47の学習項目を画面内の確認データと検証範囲に対応させる', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'web47');

    expect(checklist).toMatchObject({
      revision: 3,
      items: [
        expect.objectContaining({ label: expect.stringContaining('小さいPDF') }),
        expect.objectContaining({ label: expect.stringContaining('PDF以外') }),
        expect.objectContaining({ label: expect.stringContaining('容量超過PDF') }),
        expect.objectContaining({ label: expect.stringContaining('自分のPDF') }),
        expect.objectContaining({ label: expect.stringContaining('送信または保存しない') }),
        expect.objectContaining({ label: expect.stringContaining('サーバー側の再検証') })
      ]
    });
  });

  it('web52を判断メモ画面と比較資料へ接続する', () => {
    const theme = loadActualCatalog().themeById.get('web52');

    expect(theme).toMatchObject({
      presentation: 'web',
      lifecycle: 'none',
      actualConnection: {
        type: 'static-web',
        entryFile: 'index.html'
      }
    });
    expect(theme?.resources).toEqual([
      expect.objectContaining({ id: 'rendering-matrix', label: '表示方式比較表' }),
      expect.objectContaining({ id: 'selection-scenarios', label: '利用場面の例' }),
      expect.objectContaining({ id: 'list-comparison', label: '一覧画面での比較' }),
      expect.objectContaining({ id: 'data-boundary-guide', label: 'API・キャッシュ・認証' }),
      expect.objectContaining({ id: 'studyweb-mapping', label: 'StudyWeb対応表' }),
      expect.objectContaining({ id: 'html-source', label: 'HTML' }),
      expect.objectContaining({ id: 'javascript-source', label: 'JavaScript' }),
      expect.objectContaining({ id: 'decision-source', label: '判断メモ処理' }),
      expect.objectContaining({ id: 'css-source', label: 'CSS' }),
      expect.objectContaining({ id: 'requirements', label: '要件定義' }),
      expect.objectContaining({ id: 'basic-design', label: '基本設計' }),
      expect.objectContaining({ id: 'detailed-design', label: '詳細設計' })
    ]);
    expect(readThemeResource(theme!, 'decision-source', 'actual').content)
      .toContain('export function validateMemo');
  });

  it('web52の学習項目を判断メモ画面の操作と保存範囲に対応させる', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'web52');

    expect(checklist).toMatchObject({
      revision: 3,
      items: [
        expect.objectContaining({ label: expect.stringContaining('利用場面を切り替え') }),
        expect.objectContaining({ label: expect.stringContaining('基本となる方式') }),
        expect.objectContaining({ label: expect.stringContaining('組み合わせる仕組み') }),
        expect.objectContaining({ label: expect.stringContaining('キャッシュ範囲') }),
        expect.objectContaining({ label: expect.stringContaining('内容が復元') }),
        expect.objectContaining({ label: expect.stringContaining('サーバーへ送信されない') })
      ]
    });
  });

  it('devops09を障害対応記録画面と参照文書へ接続する', () => {
    const theme = loadActualCatalog().themeById.get('devops09');

    expect(theme).toMatchObject({
      presentation: 'web',
      lifecycle: 'none',
      actualConnection: {
        type: 'static-web',
        entryFile: 'index.html'
      }
    });
    expect(theme?.resources).toEqual([
      expect.objectContaining({ id: 'runbook', label: '障害調査Runbook' }),
      expect.objectContaining({ id: 'report-template', label: '障害報告ひな形' }),
      expect.objectContaining({ id: 'docker-checklist', label: 'Docker調査チェックリスト' }),
      expect.objectContaining({ id: 'sample-report', label: '障害報告記入例' }),
      expect.objectContaining({ id: 'html-source', label: 'HTML' }),
      expect.objectContaining({ id: 'javascript-source', label: '画面制御' }),
      expect.objectContaining({ id: 'report-source', label: '記録変換' }),
      expect.objectContaining({ id: 'css-source', label: 'CSS' }),
      expect.objectContaining({ id: 'workflow-source', label: 'CI workflow' }),
      expect.objectContaining({ id: 'requirements', label: '要件定義' }),
      expect.objectContaining({ id: 'basic-design', label: '基本設計' }),
      expect.objectContaining({ id: 'detailed-design', label: '詳細設計' })
    ]);
    expect(readThemeResource(theme!, 'report-source', 'actual').content)
      .toContain('export function buildMarkdown');
  });

  it('devops09の学習項目を記録画面の操作と保存範囲に対応させる', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'devops09');

    expect(checklist).toMatchObject({
      revision: 3,
      items: [
        expect.objectContaining({ label: expect.stringContaining('初動の順序') }),
        expect.objectContaining({ label: expect.stringContaining('利用者影響') }),
        expect.objectContaining({ label: expect.stringContaining('request ID') }),
        expect.objectContaining({ label: expect.stringContaining('事実') }),
        expect.objectContaining({ label: expect.stringContaining('再発防止') }),
        expect.objectContaining({ label: expect.stringContaining('復元') }),
        expect.objectContaining({ label: expect.stringContaining('Markdown') }),
        expect.objectContaining({ label: expect.stringContaining('CI workflow') })
      ]
    });
  });

  it('devops10をリリース判定画面と参照文書へ接続する', () => {
    const theme = loadActualCatalog().themeById.get('devops10');

    expect(theme).toMatchObject({
      name: '運用証拠によるリリース判定',
      presentation: 'web',
      lifecycle: 'none',
      actualConnection: {
        type: 'static-web',
        entryFile: 'index.html'
      }
    });
    expect(theme?.resources).toEqual([
      expect.objectContaining({ id: 'evidence-guide', label: 'リリース判定の証拠' }),
      expect.objectContaining({ id: 'sample-decision', label: 'リリース判定記入例' }),
      expect.objectContaining({ id: 'html-source', label: 'HTML' }),
      expect.objectContaining({ id: 'javascript-source', label: '画面制御' }),
      expect.objectContaining({ id: 'decision-source', label: '判定記録変換' }),
      expect.objectContaining({ id: 'css-source', label: 'CSS' }),
      expect.objectContaining({ id: 'workflow-source', label: 'CI workflow' }),
      expect.objectContaining({ id: 'requirements', label: '要件定義' }),
      expect.objectContaining({ id: 'basic-design', label: '基本設計' }),
      expect.objectContaining({ id: 'detailed-design', label: '詳細設計' })
    ]);
    expect(readThemeResource(theme!, 'decision-source', 'actual').content)
      .toContain('export function validateDecision');
  });

  it('devops10の学習項目をリリース判定画面の操作と保存範囲に対応させる', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'devops10');

    expect(checklist).toMatchObject({
      revision: 3,
      items: [
        expect.objectContaining({ label: expect.stringContaining('固定シナリオ') }),
        expect.objectContaining({ label: expect.stringContaining('build') }),
        expect.objectContaining({ label: expect.stringContaining('readiness') }),
        expect.objectContaining({ label: expect.stringContaining('ロールバック') }),
        expect.objectContaining({ label: expect.stringContaining('リリース可否') }),
        expect.objectContaining({ label: expect.stringContaining('復元') }),
        expect.objectContaining({ label: expect.stringContaining('Markdown') }),
        expect.objectContaining({ label: expect.stringContaining('CI workflow') })
      ]
    });
  });

  it('base01をヒアリングメモ作成画面と既存テンプレートへ接続する', () => {
    const theme = loadActualCatalog().themeById.get('base01');

    expect(theme).toMatchObject({
      name: '曖昧依頼のヒアリング',
      presentation: 'web',
      lifecycle: 'none',
      actualConnection: {
        type: 'static-web',
        entryFile: 'index.html'
      }
    });
    expect(theme?.resources).toEqual([
      expect.objectContaining({ id: 'ambiguous-request', label: '曖昧依頼サンプル' }),
      expect.objectContaining({ id: 'completed-note', label: 'ヒアリング記入例' }),
      expect.objectContaining({ id: 'hearing-template', label: 'ヒアリングメモひな形' }),
      expect.objectContaining({ id: 'summary-template', label: '要件定義入力メモひな形' }),
      expect.objectContaining({ id: 'html-source', label: 'HTML' }),
      expect.objectContaining({ id: 'javascript-source', label: '画面制御' }),
      expect.objectContaining({ id: 'note-source', label: 'メモ変換' }),
      expect.objectContaining({ id: 'css-source', label: 'CSS' }),
      expect.objectContaining({ id: 'requirements', label: '要件定義' }),
      expect.objectContaining({ id: 'basic-design', label: '基本設計' }),
      expect.objectContaining({ id: 'detailed-design', label: '詳細設計' })
    ]);
    expect(readThemeResource(theme!, 'note-source', 'actual').content)
      .toContain('export function buildHearingMarkdown');
  });

  it('base01の学習項目をヒアリング画面の操作と出力へ対応させる', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'base01');

    expect(checklist).toMatchObject({
      revision: 2,
      items: [
        expect.objectContaining({ label: expect.stringContaining('固定シナリオ') }),
        expect.objectContaining({ label: expect.stringContaining('成功条件') }),
        expect.objectContaining({ label: expect.stringContaining('確定情報') }),
        expect.objectContaining({ label: expect.stringContaining('確認先') }),
        expect.objectContaining({ label: expect.stringContaining('復元') }),
        expect.objectContaining({ label: expect.stringContaining('要件定義入力メモ') }),
        expect.objectContaining({ label: expect.stringContaining('ダウンロード') })
      ]
    });
  });

  it('base02を暫定成果物の作成画面と関連文書へ接続する', () => {
    const theme = loadActualCatalog().themeById.get('base02');

    expect(theme).toMatchObject({
      integrationMode: 'embedded',
      actualConnection: {
        type: 'static-web',
        root: 'category/StudyBase/src/apps/base02_incomplete_information_deliverable/app',
        entryFile: 'index.html'
      }
    });
    expect(theme?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'incomplete-case', label: '情報不足ケース' }),
      expect.objectContaining({ id: 'deliverable-template', label: '暫定成果物ひな形' }),
      expect.objectContaining({ id: 'assumption-template', label: '前提・仮定一覧ひな形' }),
      expect.objectContaining({ id: 'unknown-template', label: '未確定事項一覧ひな形' }),
      expect.objectContaining({ id: 'limitation-template', label: '成果物限界メモひな形' }),
      expect.objectContaining({ id: 'deliverable-source', label: '文書変換' })
    ]));
    expect(readThemeResource(theme!, 'deliverable-source', 'actual').content)
      .toContain('export function buildProvisionalDeliverable');
  });

  it('base02の学習項目を画面操作と4種類の出力へ対応させる', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'base02');

    expect(checklist).toMatchObject({
      revision: 2,
      items: [
        expect.objectContaining({ label: expect.stringContaining('固定シナリオ') }),
        expect.objectContaining({ label: expect.stringContaining('書ける範囲') }),
        expect.objectContaining({ label: expect.stringContaining('外れた場合の影響') }),
        expect.objectContaining({ label: expect.stringContaining('未解決時の影響') }),
        expect.objectContaining({ label: expect.stringContaining('利用してはいけない範囲') }),
        expect.objectContaining({ label: expect.stringContaining('復元') }),
        expect.objectContaining({ label: expect.stringContaining('4種類') })
      ]
    });
  });

  it('base03を見積り根拠の作成画面と関連文書へ接続する', () => {
    const theme = loadActualCatalog().themeById.get('base03');

    expect(theme).toMatchObject({
      integrationMode: 'embedded',
      actualConnection: {
        type: 'static-web',
        root: 'category/StudyBase/src/apps/base03_estimate_basis/app',
        entryFile: 'index.html'
      }
    });
    expect(theme?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'estimate-case', label: '見積りケース' }),
      expect.objectContaining({ id: 'estimate-template', label: '見積り根拠表ひな形' }),
      expect.objectContaining({ id: 'work-template', label: '作業分解表ひな形' }),
      expect.objectContaining({ id: 'risk-template', label: 'リスク一覧ひな形' }),
      expect.objectContaining({ id: 'estimate-source', label: '見積り変換' })
    ]));
    expect(readThemeResource(theme!, 'estimate-source', 'actual').content)
      .toContain('export function calculateTotal');
  });

  it('base03の学習項目を作業別工数と3種類の出力へ対応させる', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'base03');

    expect(checklist).toMatchObject({
      revision: 2,
      items: [
        expect.objectContaining({ label: expect.stringContaining('固定シナリオ') }),
        expect.objectContaining({ label: expect.stringContaining('成果物') }),
        expect.objectContaining({ label: expect.stringContaining('2.5人日') }),
        expect.objectContaining({ label: expect.stringContaining('見積りへの影響') }),
        expect.objectContaining({ label: expect.stringContaining('再見積り条件') }),
        expect.objectContaining({ label: expect.stringContaining('復元') }),
        expect.objectContaining({ label: expect.stringContaining('3種類') })
      ]
    });
  });

  it('base04をテスト成立条件の確認画面と関連文書へ接続する', () => {
    const theme = loadActualCatalog().themeById.get('base04');

    expect(theme).toMatchObject({
      name: 'テスト成立条件チェック',
      integrationMode: 'embedded',
      actualConnection: {
        type: 'static-web',
        root: 'category/StudyBase/src/apps/base04_test_precondition_checklist/app',
        entryFile: 'index.html'
      }
    });
    expect(theme?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'precondition-case', label: 'テスト前提ケース' }),
      expect.objectContaining({ id: 'completed-checklist', label: '成立条件チェック記入例' }),
      expect.objectContaining({ id: 'checklist-template', label: '成立条件チェックリストひな形' }),
      expect.objectContaining({ id: 'environment-template', label: 'テスト環境確認表ひな形' }),
      expect.objectContaining({ id: 'data-template', label: 'テストデータ確認表ひな形' }),
      expect.objectContaining({ id: 'preconditions-source', label: '成立条件の判定と文書変換' })
    ]));
    expect(readThemeResource(theme!, 'preconditions-source', 'actual').content)
      .toContain('export function decision');
  });

  it('base04の学習項目を開始可否判定と3種類の文書へ対応させる', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'base04');

    expect(checklist).toMatchObject({
      revision: 2,
      items: [
        expect.objectContaining({ label: expect.stringContaining('固定シナリオ') }),
        expect.objectContaining({ label: expect.stringContaining('アカウント') }),
        expect.objectContaining({ label: expect.stringContaining('作成方法') }),
        expect.objectContaining({ label: expect.stringContaining('開始不可') }),
        expect.objectContaining({ label: expect.stringContaining('中止条件') }),
        expect.objectContaining({ label: expect.stringContaining('復元') }),
        expect.objectContaining({ label: expect.stringContaining('3種類') })
      ]
    });
  });

  it('base05をRACI・責任分担の作成画面と関連文書へ接続する', () => {
    const theme = loadActualCatalog().themeById.get('base05');

    expect(theme).toMatchObject({
      name: 'RACI・責任分担',
      integrationMode: 'embedded',
      actualConnection: {
        type: 'static-web',
        root: 'category/StudyBase/src/apps/base05_raci_responsibility_matrix/app',
        entryFile: 'index.html'
      }
    });
    expect(theme?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'responsibility-case', label: '責任分担ケース' }),
      expect.objectContaining({ id: 'completed-raci', label: 'RACI記入例' }),
      expect.objectContaining({ id: 'raci-template', label: 'RACI表ひな形' }),
      expect.objectContaining({ id: 'decision-template', label: '判断待ち事項一覧ひな形' }),
      expect.objectContaining({ id: 'escalation-template', label: 'エスカレーションメモひな形' }),
      expect.objectContaining({ id: 'raci-source', label: 'RACIの検証と文書変換' })
    ]));
    expect(readThemeResource(theme!, 'raci-source', 'actual').content)
      .toContain('export function validateRaci');
  });

  it('base05の学習項目をRACI、判断待ち、エスカレーションへ対応させる', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'base05');

    expect(checklist).toMatchObject({
      revision: 2,
      items: [
        expect.objectContaining({ label: expect.stringContaining('固定シナリオ') }),
        expect.objectContaining({ label: expect.stringContaining('Responsible') }),
        expect.objectContaining({ label: expect.stringContaining('Consulted') }),
        expect.objectContaining({ label: expect.stringContaining('判断待ち') }),
        expect.objectContaining({ label: expect.stringContaining('エスカレーション') }),
        expect.objectContaining({ label: expect.stringContaining('整合性エラー') }),
        expect.objectContaining({ label: expect.stringContaining('3種類') })
      ]
    });
  });

  it('base06を安全な一時Gitリポジトリの状態別操作へ接続する', () => {
    const theme = loadActualCatalog().themeById.get('base06');

    expect(theme).toMatchObject({
      name: 'Git基本操作',
      presentation: 'command',
      lifecycle: 'one-shot',
      integrationMode: 'command',
      actualConnection: {
        type: 'command-one-shot',
        cwd: 'category/StudyBase'
      }
    });
    expect(theme?.operations.run?.commandOperations).toMatchObject([
      { id: 'clean-state', label: '変更前の状態を確認' },
      { id: 'unstaged-diff', label: '未ステージの差分を確認' },
      { id: 'staged-diff', label: 'ステージ済みの差分を確認' },
      { id: 'commit-history', label: 'コミットと履歴を確認' },
      { id: 'ignored-file', label: '除外ファイルを確認' },
      { id: 'all-states', label: 'すべての状態を順番に確認' }
    ]);
    expect(theme?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'practice-readme', label: '練習原本の説明' }),
      expect.objectContaining({ id: 'gitignore-source', label: '.gitignore' }),
      expect.objectContaining({ id: 'practice-script', label: 'Git練習スクリプト' }),
      expect.objectContaining({ id: 'command-log', label: 'Gitコマンド記録ひな形' })
    ]));
    expect(readThemeResource(theme!, 'practice-script', 'actual').content)
      .toContain("'all-states'");
  });

  it('base06の学習項目を画面で選べるGit状態へ対応させる', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'base06');

    expect(checklist).toMatchObject({
      revision: 2,
      items: [
        expect.objectContaining({ label: expect.stringContaining('変更前の状態を確認') }),
        expect.objectContaining({ label: expect.stringContaining('未ステージの差分を確認') }),
        expect.objectContaining({ label: expect.stringContaining('ステージ済みの差分を確認') }),
        expect.objectContaining({ label: expect.stringContaining('コミットと履歴を確認') }),
        expect.objectContaining({ label: expect.stringContaining('除外ファイルを確認') }),
        expect.objectContaining({ label: expect.stringContaining('3つを区別') })
      ]
    });
  });

  it('base07を安全な一時Gitリポジトリの競合段階別操作へ接続する', () => {
    const theme = loadActualCatalog().themeById.get('base07');

    expect(theme).toMatchObject({
      name: 'ブランチ・マージ・競合解消',
      presentation: 'command',
      lifecycle: 'one-shot',
      integrationMode: 'command',
      actualConnection: {
        type: 'command-one-shot',
        cwd: 'category/StudyBase'
      }
    });
    expect(theme?.operations.run?.commandOperations).toMatchObject([
      { id: 'branch-creation', label: 'ブランチを作成' },
      { id: 'branch-commits', label: 'ブランチ別のコミットを確認' },
      { id: 'conflict-reproduction', label: '競合を発生' },
      { id: 'conflict-resolution', label: '競合を解消' },
      { id: 'resolution-check', label: '解消後を確認' },
      { id: 'all-steps', label: 'すべての手順を確認' }
    ]);
    expect(theme?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'conflict-target', label: '競合対象のテキスト' }),
      expect.objectContaining({ id: 'branch-log', label: 'ブランチ操作記録ひな形' }),
      expect.objectContaining({ id: 'conflict-resolution', label: '競合解消記録ひな形' }),
      expect.objectContaining({ id: 'practice-script', label: '競合練習スクリプト' })
    ]));
    expect(readThemeResource(theme!, 'practice-script', 'actual').content)
      .toContain("'all-steps'");
  });

  it('base07の学習項目をブランチ作成から解消後確認までに分ける', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'base07');

    expect(checklist).toMatchObject({
      revision: 2,
      items: [
        expect.objectContaining({ label: expect.stringContaining('ブランチ一覧') }),
        expect.objectContaining({ label: expect.stringContaining('履歴が分岐') }),
        expect.objectContaining({ label: expect.stringContaining('競合マーカー') }),
        expect.objectContaining({ label: expect.stringContaining('解消コミット') }),
        expect.objectContaining({ label: expect.stringContaining('Gitの状態が変更なし') }),
        expect.objectContaining({ label: expect.stringContaining('両方の変更理由') })
      ]
    });
  });

  it('system01の学習READMEと関連ソースを読み込む', () => {
    const theme = loadActualCatalog().themeById.get('system01');

    expect(theme).toBeDefined();
    expect(theme?.entryFile).toMatch(/system01_invoice_receipt_extraction\/README\.md$/);
    expect(readActualThemeReadme(theme!).content).toContain('AIが抽出した項目を確認・訂正する流れ');
    expect(theme?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'screen-source',
      'api-routes',
      'extract-prompt',
      'representative-test'
    ]);
  });

  it('system01からsystem08を実画面に対応する学習教材へ接続する', () => {
    const catalog = loadActualCatalog();

    for (let number = 1; number <= 8; number += 1) {
      const themeId = `system${String(number).padStart(2, '0')}`;
      const theme = catalog.themeById.get(themeId);
      const checklist = catalog.checklists.find((item) => item.themeId === themeId);

      expect(theme?.entryFile).toMatch(/\/doc\/learning_notes\/system\d{2}_.+\/README\.md$/);
      expect(themeSpecificResources(theme?.resources)).toHaveLength(4);
      expect(theme?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual(expect.arrayContaining([
        'screen-source',
        'api-routes',
        'representative-test'
      ]));
      expect(checklist?.revision).toBeGreaterThanOrEqual(2);
      expect(checklist?.items.length).toBeGreaterThanOrEqual(5);
      expect(checklist?.items.every((item) => !item.label.startsWith('工程'))).toBe(true);
    }
  });

  it('system09からsystem16を実画面と実処理へ接続する', () => {
    const catalog = loadActualCatalog();
    const expectedChecklistItemCounts: Record<string, number> = {
      system11: 6,
      system14: 7,
      system16: 8
    };

    for (let number = 9; number <= 16; number += 1) {
      const themeId = `system${String(number).padStart(2, '0')}`;
      const theme = catalog.themeById.get(themeId);
      const checklist = catalog.checklists.find((item) => item.themeId === themeId);

      expect(theme?.entryFile).toMatch(/\/doc\/learning_notes\/system\d{2}_.+\/README\.md$/);
      expect(checklist?.revision).toBeGreaterThanOrEqual(2);
      expect(checklist?.items).toHaveLength(expectedChecklistItemCounts[themeId] ?? 5);
      expect(checklist?.items.every((item) => !item.label.startsWith('工程'))).toBe(true);

      if (themeId === 'system15') {
        expect(theme?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
          'bridge-screen',
          'bridge-server',
          'bridge-test',
          'current-specification'
        ]);
        expect(theme?.actualConnection).toMatchObject({
          type: 'web-process',
          cwd: 'category/StudyAI/src/apps/system15_book_summarization_bridge',
          command: 'node',
          args: ['app/server.js'],
          url: 'http://127.0.0.1:43715/',
          healthUrl: 'http://127.0.0.1:43715/health'
        });
        expect(theme?.operations.start).toMatchObject({
          processes: [expect.objectContaining({
            url: 'http://127.0.0.1:43715/',
            healthUrl: 'http://127.0.0.1:43715/health'
          })]
        });
      } else {
        expect(themeSpecificResources(theme?.resources)).toHaveLength(4);
        expect(theme?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual(expect.arrayContaining([
          'screen-source',
          'api-routes',
          'representative-test'
        ]));
      }
    }
  });

  it('system17からsystem24を実験画面と実装確認用ファイルへ接続する', () => {
    const catalog = loadActualCatalog();

    for (let number = 17; number <= 24; number += 1) {
      const themeId = `system${String(number).padStart(2, '0')}`;
      const theme = catalog.themeById.get(themeId);
      const checklist = catalog.checklists.find((item) => item.themeId === themeId);

      expect(theme?.entryFile).toMatch(/\/doc\/learning_notes\/system\d{2}_.+\/README\.md$/);
      expect(themeSpecificResources(theme?.resources)).toHaveLength(4);
      expect(theme?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual(expect.arrayContaining([
        'screen-source',
        'api-routes',
        'representative-test'
      ]));
      expect(checklist?.revision).toBeGreaterThanOrEqual(2);
      expect(checklist?.items.length).toBeGreaterThanOrEqual(5);
      expect(checklist?.items.every((item) => !item.label.includes('validator'))).toBe(true);
    }
  });

  it('system25からsystem32を専用表示と実装確認用ファイルへ接続する', () => {
    const catalog = loadActualCatalog();

    for (let number = 25; number <= 32; number += 1) {
      const themeId = `system${String(number).padStart(2, '0')}`;
      const theme = catalog.themeById.get(themeId);
      const checklist = catalog.checklists.find((item) => item.themeId === themeId);

      expect(theme?.entryFile).toMatch(/\/doc\/learning_notes\/system\d{2}_.+\/README\.md$/);
      expect(themeSpecificResources(theme?.resources)).toHaveLength(4);
      expect(theme?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
        'screen-source',
        'api-routes',
        'experiment-service',
        'representative-test'
      ]);
      expect(checklist?.revision).toBeGreaterThanOrEqual(3);
      expect(checklist?.items.length).toBeGreaterThanOrEqual(5);
      expect(checklist?.items.every((item) => !item.label.includes('validator'))).toBe(true);
    }
  });

  it('system33からsystem36を評価画面と実装確認用ファイルへ接続する', () => {
    const catalog = loadActualCatalog();

    for (let number = 33; number <= 36; number += 1) {
      const themeId = `system${String(number).padStart(2, '0')}`;
      const theme = catalog.themeById.get(themeId);
      const checklist = catalog.checklists.find((item) => item.themeId === themeId);

      expect(theme?.entryFile).toMatch(/\/doc\/learning_notes\/system\d{2}_.+\/README\.md$/);
      expect(theme?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
        'screen-source',
        'api-routes',
        'experiment-service',
        'representative-test'
      ]);
      expect(checklist?.revision).toBeGreaterThanOrEqual(3);
      expect(checklist?.items.length).toBeGreaterThanOrEqual(5);
      expect(checklist?.items.every((item) => !item.label.includes('validator'))).toBe(true);
    }

    expect(catalog.themeById.get('system36')?.name).toBe('実行Traceの作成');
  });

  it('system37からsystem40を企業AIの学習READMEと実装確認用ファイルへ接続する', () => {
    const catalog = loadActualCatalog();

    for (let number = 37; number <= 40; number += 1) {
      const themeId = `system${String(number).padStart(2, '0')}`;
      const theme = catalog.themeById.get(themeId);
      const checklist = catalog.checklists.find((item) => item.themeId === themeId);

      expect(theme?.entryFile).toMatch(/\/doc\/learning_notes\/system\d{2}_.+\/README\.md$/);
      expect(theme?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
        'screen-source',
        'api-routes',
        'enterprise-service',
        'representative-test'
      ]);
      expect(checklist?.revision).toBeGreaterThanOrEqual(3);
      expect(checklist?.items.length).toBeGreaterThanOrEqual(7);
    }
  });

  it('system41からsystem44を企業AIの学習READMEと実装確認用ファイルへ接続する', () => {
    const catalog = loadActualCatalog();

    for (let number = 41; number <= 44; number += 1) {
      const themeId = `system${String(number).padStart(2, '0')}`;
      const theme = catalog.themeById.get(themeId);
      const checklist = catalog.checklists.find((item) => item.themeId === themeId);

      expect(theme?.entryFile).toMatch(/\/doc\/learning_notes\/system\d{2}_.+\/README\.md$/);
      expect(theme?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
        'screen-source',
        'api-routes',
        'enterprise-service',
        'representative-test'
      ]);
      expect(checklist?.revision).toBeGreaterThanOrEqual(3);
      expect(checklist?.items.length).toBeGreaterThanOrEqual(7);
    }
  });

  it('system45からsystem48を個別操作と実装確認用ファイルへ接続する', () => {
    const catalog = loadActualCatalog();
    const expectedOperationIds = {
      system45: ['valid-input', 'missing-fields', 'sensitive-input'],
      system46: ['valid-fixture', 'missing-input', 'allowed-operations', 'forbidden-operations', 'check-output-schema'],
      system47: ['monthly-sales', 'product-sales', 'customer-sales', 'ai-explanation', 'unsafe-sql'],
      system48: [
        'mock-success',
        'mock-approval',
        'mock-missing-context',
        'local-llm',
        'check-task-board',
        'check-success-task',
        'check-approval-task',
        'check-missing-context-task',
        'check-role-outputs',
        'check-approval-boundary'
      ]
    };
    const expectedChecklistShapes = {
      system45: { revision: 3, count: 7 },
      system46: { revision: 4, count: 7 },
      system47: { revision: 5, count: 7 },
      system48: { revision: 5, count: 9 }
    };

    for (const [themeId, operationIds] of Object.entries(expectedOperationIds)) {
      const theme = catalog.themeById.get(themeId);
      const checklist = catalog.checklists.find((item) => item.themeId === themeId);
      const expectedChecklist = expectedChecklistShapes[themeId as keyof typeof expectedChecklistShapes];

      expect(theme?.entryFile).toMatch(/\/doc\/learning_notes\/system\d{2}_.+\/README\.md$/);
      expect(theme?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).length).toBeGreaterThanOrEqual(4);
      expect(theme?.operations.run?.commandOperations?.map((operation) => operation.id)).toEqual(operationIds);
      expect(checklist?.revision).toBe(expectedChecklist.revision);
      expect(checklist?.items).toHaveLength(expectedChecklist.count);
    }

    expect(catalog.themeById.get('system45')?.operations.run?.commandOperations?.slice(1)
      .every((operation) => operation.processes[0]?.allowFailure === true)).toBe(true);
    expect(catalog.themeById.get('system47')?.operations.run?.commandOperations?.at(-1)
      ?.processes[0]?.allowFailure).toBe(true);
    expect(catalog.themeById.get('system47')).toMatchObject({
      presentation: 'command',
      lifecycle: 'stack',
      environment: { required: ['Docker Desktop', 'Node.js', 'LM Studio（5858番、チャット用モデル。SQL集計はLM Studio不要）'] },
      timeoutSeconds: 300
    });
    expect(catalog.themeById.get('system47')?.operations.start?.processes.map((process) => process.id))
      .toEqual(['previous-environment-cleanup', 'database', 'schema', 'seed']);
    expect(catalog.themeById.get('system47')?.operations.start?.cleanup?.map((process) => process.id))
      .toEqual(['compose-down']);
    expect(catalog.themeById.get('system47')?.operations.run?.commandOperations?.slice(0, 3)
      .every((operation) => operation.processes[0]?.args[0] === 'scripts/sql_analysis.js')).toBe(true);
    expect(catalog.themeById.get('system48')).toMatchObject({
      environment: { required: ['Node.js', 'LM Studio（5858番、チャット用モデル。模擬実行はLM Studio不要）'] },
      timeoutSeconds: 1800
    });
  });

  it('security01からsecurity04を許可・拒否の比較操作と関連ファイルへ接続する', () => {
    const catalog = loadActualCatalog();
    const expectedRequestIds = {
      security01: ['before-login', 'invalid-login', 'login', 'after-login', 'logout', 'after-logout'],
      security02: ['invalid-login', 'issue-token', 'valid-token', 'tampered-token', 'expired-token', 'missing-token'],
      security03: ['unauthenticated', 'viewer-read', 'viewer-cancel', 'operator-cancel'],
      security04: [
        'unauthenticated',
        'alice-read-sales',
        'alice-update-draft',
        'alice-read-updated',
        'bob-read-sales',
        'bob-read-support',
        'bob-update-confirmed',
        'admin-read-support',
        'missing-order'
      ]
    };

    for (const [themeId, requestIds] of Object.entries(expectedRequestIds)) {
      const theme = catalog.themeById.get(themeId);
      const checklist = catalog.checklists.find((item) => item.themeId === themeId);

      expect(theme?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).length).toBeGreaterThanOrEqual(2);
      expect(theme?.operations.start?.processes[0]?.healthUrl).toMatch(/\/health$/);
      expect(theme?.operations.run?.requests?.map((request) => request.id)).toEqual(requestIds);
      expect(checklist?.revision).toBe(3);
      expect(checklist?.items).toHaveLength(6);
    }
  });

  it('security05からsecurity08を教材固有の比較操作と関連ファイルへ接続する', () => {
    const catalog = loadActualCatalog();
    const security05 = catalog.themeById.get('security05');
    const security06 = catalog.themeById.get('security06');
    const security07 = catalog.themeById.get('security07');
    const security08 = catalog.themeById.get('security08');

    expect(security05?.operations.run?.commandOperations?.map((operation) => operation.id))
      .toEqual(['validation-demo', 'boundary-tests']);
    expect(security06?.operations.run?.commandOperations?.map((operation) => operation.id))
      .toEqual(['attack-input', 'name-only', 'status-only']);
    expect(security07?.operations.start?.processes[0]?.healthUrl).toBe('http://127.0.0.1:4107/health');
    expect(security07?.operations.run?.requests?.map((request) => request.id)).toEqual([
      'reset-demo', 'without-session', 'issue-token', 'without-token', 'valid-transfer', 'reuse-token'
    ]);
    expect(security07?.operations.start?.processes[0]?.url).toBe('http://127.0.0.1:4107/demo');
    expect(security08?.operations.start?.processes[0]?.url).toBe('http://127.0.0.1:4108/');
    expect([security05, security06, security07, security08]
      .map((theme) => theme?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).length)).toEqual([4, 3, 3, 4]);
    expect(security07?.resources?.some((resource) => resource.id === 'page-source')).toBe(true);

    for (const themeId of ['security05', 'security06', 'security08']) {
      const checklist = catalog.checklists.find((item) => item.themeId === themeId);
      expect(checklist).toMatchObject({ revision: 2 });
      expect(checklist?.items).toHaveLength(5);
    }
    const security07Checklist = catalog.checklists.find((item) => item.themeId === 'security07');
    expect(security07Checklist).toMatchObject({ revision: 3 });
    expect(security07Checklist?.items).toHaveLength(6);
  });

  it('security09からsecurity12をアップロード・秘密情報・Webhook・監査ログの操作へ接続する', () => {
    const catalog = loadActualCatalog();
    const security09 = catalog.themeById.get('security09');
    const security10 = catalog.themeById.get('security10');
    const security11 = catalog.themeById.get('security11');
    const security12 = catalog.themeById.get('security12');

    expect(security09?.operations.start?.processes[0]?.url).toBe('http://127.0.0.1:4109/');
    expect(security10?.operations.run?.commandOperations?.map((operation) => operation.id))
      .toEqual(['missing-settings', 'configured-settings']);
    expect(security11?.operations.start?.processes[0]?.healthUrl).toBe('http://127.0.0.1:4111/health');
    expect(security11?.operations.run?.requests?.map((request) => request.id)).toEqual([
      'valid-signature', 'tampered-body', 'expired-timestamp', 'missing-event-id', 'replay-event', 'body-too-large'
    ]);
    expect(security12?.operations.run?.commandOperations?.map((operation) => operation.id))
      .toEqual(['all-events', 'success-event', 'denied-event']);
    expect([security09, security10, security11, security12]
      .map((theme) => theme?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).length)).toEqual([4, 3, 5, 3]);
    expect(security09?.resources?.some((resource) => resource.id === 'upload-policy')).toBe(true);
    expect(security10?.resources?.some((resource) => resource.id === 'secret-rotation')).toBe(true);
    expect(security11?.resources?.some((resource) => resource.id === 'replay-protection')).toBe(true);
    expect(security12?.resources?.some((resource) => resource.id === 'audit-events')).toBe(true);
    expect(security10?.operations.run?.commandOperations?.[1]?.processes[0]?.env).toMatchObject({
      APP_SECRET: 'example-studyhub-local-app-secret',
      WEBHOOK_SECRET: 'example-studyhub-local-webhook-secret'
    });

    for (const themeId of ['security09', 'security10', 'security11', 'security12']) {
      const checklist = catalog.checklists.find((item) => item.themeId === themeId);
      expect(checklist).toMatchObject({ revision: 3 });
      expect(checklist?.items).toHaveLength(6);
    }
  });

  it('security13からsecurity16をレート制限・CORS・ヘッダー・依存関係の比較操作へ接続する', () => {
    const catalog = loadActualCatalog();
    const security13 = catalog.themeById.get('security13');
    const security14 = catalog.themeById.get('security14');
    const security15 = catalog.themeById.get('security15');
    const security16 = catalog.themeById.get('security16');

    expect(security13?.operations.start?.processes[0]?.healthUrl).toBe('http://127.0.0.1:4113/health');
    expect(security13?.operations.run?.requests?.map((request) => request.id)).toEqual([
      'burst-limit', 'reset-window', 'key-isolation', 'single-request'
    ]);
    expect(security14?.operations.run?.requests?.map((request) => request.id)).toEqual([
      'allowed-preflight', 'denied-origin', 'denied-method', 'denied-header', 'allowed-get'
    ]);
    expect(security15?.operations.run?.requests?.map((request) => request.id)).toEqual([
      'protected-response', 'unprotected-response'
    ]);
    expect(security16?.operations.run?.commandOperations?.map((operation) => operation.id)).toEqual([
      'full-plan', 'severity-summary', 'sorted-actions', 'invalid-report'
    ]);
    expect([security13, security14, security15, security16]
      .map((theme) => theme?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).length)).toEqual([3, 2, 2, 3]);

    for (const themeId of ['security13', 'security14', 'security15']) {
      const checklist = catalog.checklists.find((item) => item.themeId === themeId);
      expect(checklist).toMatchObject({ revision: 2 });
      expect(checklist?.items).toHaveLength(5);
    }
    expect(catalog.checklists.find((item) => item.themeId === 'security16')).toMatchObject({ revision: 3 });
    expect(catalog.checklists.find((item) => item.themeId === 'security16')?.items).toHaveLength(6);
  });

  it('security17からsecurity20をAI入力境界・保持・マスキングの比較教材へ接続する', () => {
    const catalog = loadActualCatalog();
    const security17 = catalog.themeById.get('security17');
    const security18 = catalog.themeById.get('security18');
    const security19 = catalog.themeById.get('security19');
    const security20 = catalog.themeById.get('security20');

    expect(security17?.operations.start?.processes[0]?.url).toBe('http://127.0.0.1:4117/');
    expect(security18?.operations.start?.processes[0]?.url).toBe('http://127.0.0.1:4118/');
    expect(security19?.operations.run?.commandOperations?.map((operation) => operation.id)).toEqual([
      'retention-results', 'reason-summary', 'deletion-candidates', 'invalid-and-future-dates'
    ]);
    expect(security20?.operations.run?.commandOperations?.map((operation) => operation.id)).toEqual([
      'mask-all', 'unchanged-text', 'masking-cases'
    ]);
    expect([security17, security18, security19, security20]
      .map((theme) => theme?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).length)).toEqual([3, 3, 3, 3]);
    expect(security17?.resources?.map((resource) => resource.id)).toEqual(expect.arrayContaining(['guardrail-policy']));
    expect(security18?.resources?.map((resource) => resource.id)).toEqual(expect.arrayContaining(['trust-boundary']));

    for (const themeId of ['security18']) {
      const checklist = catalog.checklists.find((item) => item.themeId === themeId);
      expect(checklist).toMatchObject({ revision: 2 });
      expect(checklist?.items).toHaveLength(5);
    }
    for (const themeId of ['security19', 'security20']) {
      const checklist = catalog.checklists.find((item) => item.themeId === themeId);
      expect(checklist).toMatchObject({ revision: 3 });
      expect(checklist?.items).toHaveLength(6);
    }
    expect(catalog.checklists.find((item) => item.themeId === 'security17')).toMatchObject({ revision: 3 });
    expect(catalog.checklists.find((item) => item.themeId === 'security17')?.items).toHaveLength(6);
  });

  it('security21を判定・監査・人による確認対象の比較教材へ接続する', () => {
    const catalog = loadActualCatalog();
    const theme = catalog.themeById.get('security21');
    const checklist = catalog.checklists.find((item) => item.themeId === 'security21');

    expect(theme?.operations.run?.commandOperations?.map((operation) => operation.id)).toEqual([
      'moderation-decisions', 'audit-records', 'review-queue'
    ]);
    expect(theme?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'moderation-source', 'policy-source', 'content-taxonomy', 'case-table', 'audit-source',
      'audit-schema', 'safe-responses', 'escalation-notes'
    ]);
    expect(checklist).toMatchObject({ revision: 3 });
    expect(checklist?.items).toHaveLength(6);
  });

  it('aws01とaws02を権限判定・通信経路の比較教材へ接続する', () => {
    const catalog = loadActualCatalog();
    const aws01 = catalog.themeById.get('aws01');
    const aws02 = catalog.themeById.get('aws02');

    expect(aws01?.operations.run?.commandOperations?.map((operation) => operation.id)).toEqual([
      'allowed-actions', 'implicit-deny', 'explicit-deny', 'admin-risk'
    ]);
    expect(aws02?.operations.run?.commandOperations?.map((operation) => operation.id)).toEqual([
      'public-web', 'internal-api', 'internal-database', 'private-api-host-port', 'private-database-host-port'
    ]);
    expect(aws02?.operations.run?.commandOperations
      ?.find((operation) => operation.id === 'private-database-host-port')
      ?.processes).toMatchObject([
      {
        id: 'database-publishers',
        command: 'docker',
        args: ['compose', '--parallel', '1', '-p', 'studyhub-aws02', 'ps', '--format', 'json', 'db']
      },
      { id: 'private-database-host-port' }
    ]);
    expect(aws01?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'policy-check-source', 'readonly-policy', 'developer-policy', 'app-role-policy', 'admin-policy',
      'permission-matrix', 'troubleshooting-checklist'
    ]);
    expect(aws02?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'compose-definition', 'public-web-source', 'internal-api-source', 'internal-database-source',
      'host-check-source', 'network-matrix', 'dangerous-rules'
    ]);
    expect(catalog.checklists.find((item) => item.themeId === 'aws01')).toMatchObject({ revision: 3 });
    expect(catalog.checklists.find((item) => item.themeId === 'aws01')?.items).toHaveLength(6);
    expect(catalog.checklists.find((item) => item.themeId === 'aws02')).toMatchObject({ revision: 3 });
    expect(catalog.checklists.find((item) => item.themeId === 'aws02')?.items).toHaveLength(7);
  });

  it('aws03とaws04をサーバー状態・接続設定の比較教材へ接続する', () => {
    const catalog = loadActualCatalog();
    const aws03 = catalog.themeById.get('aws03');
    const aws04 = catalog.themeById.get('aws04');

    expect(aws03?.operations.run?.commandOperations?.map((operation) => operation.id)).toEqual([
      'health-response', 'container-logs', 'published-port', 'container-diagnostics', 'stop-failure-recovery'
    ]);
    expect(aws04?.operations.run?.commandOperations?.map((operation) => operation.id)).toEqual([
      'successful-connection', 'authentication-failure', 'network-failure'
    ]);
    expect(aws03?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'server-source', 'health-check-source', 'container-diagnostics-source', 'dockerfile', 'server-checklist', 'ssh-key-notes'
    ]);
    expect(aws04?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'db-check-source', 'compose-definition', 'dockerfile', 'env-example', 'connection-checklist', 'rds-notes'
    ]);
    expect(catalog.checklists.find((item) => item.themeId === 'aws03')).toMatchObject({ revision: 3 });
    expect(catalog.checklists.find((item) => item.themeId === 'aws03')?.items).toHaveLength(6);
    expect(catalog.checklists.find((item) => item.themeId === 'aws04')).toMatchObject({ revision: 3 });
    expect(catalog.checklists.find((item) => item.themeId === 'aws04')?.items).toHaveLength(6);
  });

  it('aws05とaws06をobject保存・構造化ログの比較教材へ接続する', () => {
    const catalog = loadActualCatalog();
    const aws05 = catalog.themeById.get('aws05');
    const aws06 = catalog.themeById.get('aws06');

    expect(aws05?.operations.run?.commandOperations?.map((operation) => operation.id)).toEqual([
      'save-read', 'list-objects', 'delete-object', 'metadata-access', 'reject-unsafe-key'
    ]);
    expect(aws05?.operations.run?.commandOperations?.every((operation) =>
      operation.processes[0]?.temporaryDirectoryEnv === 'STUDYAWS_STORAGE_ROOT')).toBe(true);
    expect(aws06?.operations.run?.requests?.map((request) => request.id)).toEqual([
      'normal-request', 'error-request', 'sensitive-request'
    ]);
    expect(aws06?.operations.run?.requests?.slice(0, 2).map((request) => request.headers?.['x-request-id']))
      .toEqual(['aws06-normal-001', 'aws06-error-001']);
    expect(aws05?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'storage-source', 'sample-object', 'object-storage-notes', 'public-access-checklist'
    ]);
    expect(aws06?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'server-source', 'log-fields', 'incident-checklist'
    ]);

    expect(catalog.checklists.find((item) => item.themeId === 'aws05')).toMatchObject({ revision: 4 });
    expect(catalog.checklists.find((item) => item.themeId === 'aws05')?.items).toHaveLength(7);
    expect(catalog.checklists.find((item) => item.themeId === 'aws06')).toMatchObject({ revision: 3 });
    expect(catalog.checklists.find((item) => item.themeId === 'aws06')?.items).toHaveLength(6);
  });

  it('aws07とaws08をLambdaの直接呼出しとHTTP変換の比較教材へ接続する', () => {
    const catalog = loadActualCatalog();
    const aws07 = catalog.themeById.get('aws07');
    const aws08 = catalog.themeById.get('aws08');

    expect(aws07?.operations.run?.commandOperations?.map((operation) => operation.id)).toEqual([
      'valid-event', 'missing-name', 'runtime-settings'
    ]);
    expect(aws08?.operations.run?.requests?.map((request) => request.id)).toEqual([
      'list-items', 'get-item', 'create-item', 'missing-name', 'invalid-json', 'missing-route'
    ]);
    expect(aws08?.operations.run?.requests?.find((request) => request.id === 'invalid-json')?.body).toBe('{');
    expect(aws07?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'handler-source', 'invoke-source', 'event-sample', 'event-notes', 'sam-template'
    ]);
    expect(aws08?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'handler-source', 'local-api-source', 'route-design', 'proxy-notes', 'sam-template'
    ]);

    for (const [themeId, itemCount] of [['aws07', 6], ['aws08', 8]] as const) {
      const checklist = catalog.checklists.find((item) => item.themeId === themeId);
      expect(checklist).toMatchObject({ revision: 3 });
      expect(checklist?.items).toHaveLength(itemCount);
    }
  });

  it('aws09とaws10を運用状態の比較と一時領域での復旧確認へ接続する', () => {
    const catalog = loadActualCatalog();
    const aws09 = catalog.themeById.get('aws09');
    const aws10 = catalog.themeById.get('aws10');

    expect(aws09?.operations.run?.requests?.map((request) => request.id)).toEqual([
      'health', 'service', 'config', 'missing-config', 'simulate-failure', 'failed-health', 'recover'
    ]);
    expect(aws09?.operations.run?.requests?.find((request) => request.id === 'missing-config'))
      .toMatchObject({ method: 'GET', url: 'http://127.0.0.1:43509/config?required=DEPLOY_TOKEN' });
    expect(aws09).toMatchObject({
      presentation: 'request',
      lifecycle: 'stack',
      actualConnection: {
        type: 'request-stack',
        startup: [
          { id: 'image-build', command: 'docker', args: ['build', '-t', 'studyhub-aws09', '.'] },
          { id: 'application', command: 'docker', healthUrl: 'http://127.0.0.1:43509/health' }
        ],
        cleanup: [{ id: 'container-stop', command: 'docker', args: ['stop', 'studyhub-aws09'] }]
      }
    });
    expect(aws10?.operations.run?.commandOperations?.map((operation) => operation.id)).toEqual([
      'backup', 'restore-dry-run', 'restore', 'missing-backup'
    ]);
    expect(aws10?.operations.run?.commandOperations?.every((operation) =>
      operation.processes[0]?.temporaryDirectoryEnv === 'STUDYAWS_BACKUP_ROOT')).toBe(true);
    expect(aws09?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'server-source', 'dockerfile', 'env-example', 'deploy-checklist', 'service-comparison'
    ]);
    expect(aws10?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'recovery-drill', 'backup-source', 'restore-source', 'sample-data', 'recovery-checklist', 'rpo-rto-notes'
    ]);

    for (const [themeId, revision, itemCount] of [['aws09', 3, 8], ['aws10', 2, 5]] as const) {
      const checklist = catalog.checklists.find((item) => item.themeId === themeId);
      expect(checklist).toMatchObject({ revision });
      expect(checklist?.items).toHaveLength(itemCount);
    }
  });

  it('別々の実行環境が同じローカルポートを使用しない', () => {
    const catalog = loadActualCatalog();
    const portUsers = new Map<string, Map<string, string[]>>();

    for (const theme of catalog.themes) {
      const runtimeId = theme.operations.start?.runtimeId ?? theme.id;
      const urls = [
        ...(theme.operations.start?.processes.flatMap((process) => [process.url, process.healthUrl]) ?? []),
        theme.operations.run?.url
      ].filter((url): url is string => Boolean(url));

      for (const value of urls) {
        const url = new URL(value);
        if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !url.port) continue;
        const runtimeUsers = portUsers.get(url.port) ?? new Map<string, string[]>();
        const themes = runtimeUsers.get(runtimeId) ?? [];
        if (!themes.includes(theme.id)) themes.push(theme.id);
        runtimeUsers.set(runtimeId, themes);
        portUsers.set(url.port, runtimeUsers);
      }
    }

    const conflicts = [...portUsers]
      .filter(([, runtimeUsers]) => runtimeUsers.size > 1)
      .map(([port, runtimeUsers]) => ({ port, runtimeIds: [...runtimeUsers.keys()] }));
    expect(conflicts).toEqual([]);
  });

  it('Web起動テーマにテーマ固有の作業フォルダとループバックURLを設定する', () => {
    const theme = loadActualCatalog().themeById.get('web07');

    expect(theme?.operations.start?.processes[0]).toMatchObject({
      command: 'node',
      cwd: expect.stringMatching(/^category\//),
      url: 'http://127.0.0.1:43207/',
      healthUrl: 'http://127.0.0.1:43207/'
    });
  });

  it('API起動テーマに起動処理と実リクエストを設定する', () => {
    const theme = loadActualCatalog().themeById.get('web14');

    expect(theme?.operations.start?.processes[0]).toMatchObject({
      command: 'node',
      env: { PORT: '43314' },
      url: 'http://127.0.0.1:43314/tasks/guide'
    });
    expect(theme?.operations.run?.requests).toMatchObject([
      { id: 'valid-task', method: 'POST', url: 'http://127.0.0.1:43314/tasks' },
      { id: 'empty-title', method: 'POST', body: { title: '' } },
      { id: 'unexpected-field', method: 'POST', body: { unexpected: true } }
    ]);
    expect(theme?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'controller-source' }),
      expect.objectContaining({ id: 'dto-source' }),
      expect.objectContaining({ id: 'service-source' }),
      expect.objectContaining({ id: 'validation-source' })
    ]));
  });

  it('GET APIテーマは教材欄にも実際のAPIを表示する', () => {
    const theme = loadActualCatalog().themeById.get('web13');

    expect(theme?.operations.start?.processes[0]?.url).toBe('http://127.0.0.1:43313/hello');
    expect(theme?.operations.run?.requests).toMatchObject([
      { id: 'hello', method: 'GET', url: 'http://127.0.0.1:43313/hello' },
      { id: 'not-found', method: 'GET', url: 'http://127.0.0.1:43313/unknown' }
    ]);
    expect(theme?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'controller-source' }),
      expect.objectContaining({ id: 'service-source' }),
      expect.objectContaining({ id: 'module-source' })
    ]));
  });

  it('状態コードのテーマに正常・400・404・500の操作を設定する', () => {
    const theme = loadActualCatalog().themeById.get('web15');

    expect(theme?.operations.run?.requests).toMatchObject([
      { id: 'ok', method: 'GET' },
      { id: 'bad-request', method: 'GET' },
      { id: 'not-found', method: 'GET' },
      { id: 'server-error', method: 'GET' }
    ]);
    expect(theme?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'controller-source' }),
      expect.objectContaining({ id: 'service-source' })
    ]));
  });

  it('API・DBテーマにDocker起動処理と後片付けを設定する', () => {
    const theme = loadActualCatalog().themeById.get('web16');

    expect(theme?.operations.start?.processes).toHaveLength(3);
    expect(theme?.operations.start?.processes[0]).toMatchObject({
      command: 'docker',
      args: ['compose', 'up', '--build', '-d', 'db'],
      execution: 'task'
    });
    expect(theme?.operations.start?.cleanup?.[0]).toMatchObject({
      command: 'docker',
      args: ['compose', 'down', '--remove-orphans']
    });
    expect(theme?.operations.run?.requests).toMatchObject([
      { id: 'create', label: '登録', method: 'POST', url: 'http://127.0.0.1:13016/tasks' },
      { id: 'list', label: '一覧表示', method: 'GET', url: 'http://127.0.0.1:13016/tasks' },
      { id: 'get', label: '1件表示', method: 'GET', url: 'http://127.0.0.1:13016/tasks/{id}' },
      { id: 'update', label: '更新', method: 'PATCH', url: 'http://127.0.0.1:13016/tasks/{id}' },
      { id: 'delete', label: '削除', method: 'DELETE', url: 'http://127.0.0.1:13016/tasks/{id}' }
    ]);
    expect(theme?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'controller-source' }),
      expect.objectContaining({ id: 'service-source' }),
      expect.objectContaining({ id: 'schema-source' })
    ]));
  });

  it('関連データのテーマにユーザーとタスクの操作を設定する', () => {
    const theme = loadActualCatalog().themeById.get('web17');

    expect(theme?.operations.run?.requests).toMatchObject([
      { id: 'create-user', label: 'ユーザー登録', method: 'POST' },
      { id: 'list-users', label: 'ユーザー一覧', method: 'GET' },
      { id: 'get-user', label: 'ユーザー1件表示', method: 'GET' },
      { id: 'create-task', label: 'タスク登録', method: 'POST' },
      { id: 'list-tasks', label: 'タスク一覧', method: 'GET' }
    ]);
    expect(theme?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'user-service-source' }),
      expect.objectContaining({ id: 'task-service-source' }),
      expect.objectContaining({ id: 'schema-source' })
    ]));
  });

  it('APIを持たないweb18をコマンドとDBのテーマとして分類する', () => {
    const theme = loadActualCatalog().themeById.get('web18');

    expect(theme).toMatchObject({
      presentation: 'command',
      lifecycle: 'stack',
      integrationStatus: 'connected'
    });
    expect(theme?.operations.run?.commandOperations).toMatchObject([
      { id: 'migration', label: 'Migrationを実行' },
      { id: 'migration-status', label: 'Migration状態を表示' },
      { id: 'seed', label: 'Seedを実行' },
      { id: 'database-contents', label: 'DB内容と件数を表示' }
    ]);
    const migration = theme?.operations.run?.commandOperations?.find((item) => item.id === 'migration');
    expect(migration?.processes[0]?.args).toEqual(expect.arrayContaining(['migrate', 'deploy']));
    expect(migration?.processes[0]?.args).not.toContain('dev');
    expect(theme?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'schema-source' }),
      expect.objectContaining({ id: 'migration-source' }),
      expect.objectContaining({ id: 'seed-source' }),
      expect.objectContaining({ id: 'compose-source' })
    ]));
    expect(readThemeResource(theme!, 'migration-source', 'actual').content)
      .toContain('CREATE TABLE "Category"');
    expect(theme?.operations.start?.cleanup?.[0]?.args).not.toContain('--volumes');
  });

  it('npm scriptsテーマに既存の開発・ビルド・テスト・起動コマンドを設定する', () => {
    const theme = loadActualCatalog().themeById.get('base09');

    expect(theme?.operations.run?.commandOperations).toMatchObject([
      { id: 'development', label: 'devを実行', processes: [{ command: 'npm', args: ['run', 'dev'] }] },
      { id: 'build', label: 'buildを実行', processes: [{ command: 'npm', args: ['run', 'build'] }] },
      { id: 'test', label: 'testを実行', processes: [{ command: 'npm', args: ['test'] }] },
      { id: 'start', label: 'startを実行', processes: [{ command: 'npm', args: ['start'] }] },
      {
        id: 'missing-script',
        label: '存在しないscriptのエラーを確認',
        processes: [{ command: 'npm', args: ['--logs-max=0', 'run', 'missing-script'], allowFailure: true }]
      }
    ]);
    expect(theme?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'package-json', label: 'package.json' }),
      expect.objectContaining({ id: 'main-source', label: '実行するJavaScript' }),
      expect.objectContaining({ id: 'test-source', label: '最小テスト' }),
      expect.objectContaining({ id: 'error-note', label: 'npmエラーの確認方法' })
    ]));
    expect(readThemeResource(theme!, 'package-json', 'actual').content)
      .toContain('"build": "node --check src/index.js"');
  });

  it('base09の学習項目を各scriptとエラー確認へ分ける', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'base09');

    expect(checklist).toMatchObject({
      revision: 2,
      items: [
        expect.objectContaining({ label: expect.stringContaining('4つのscript') }),
        expect.objectContaining({ label: expect.stringContaining('devを実行') }),
        expect.objectContaining({ label: expect.stringContaining('buildを実行') }),
        expect.objectContaining({ label: expect.stringContaining('testを実行') }),
        expect.objectContaining({ label: expect.stringContaining('startを実行') }),
        expect.objectContaining({ label: expect.stringContaining('Missing script') })
      ]
    });
  });

  it('base10を状態コード別のAPI操作と関連資料へ接続する', () => {
    const theme = loadActualCatalog().themeById.get('base10');

    expect(theme).toMatchObject({
      name: 'curlによるAPI確認',
      presentation: 'request',
      lifecycle: 'process',
      integrationStatus: 'connected'
    });
    expect(theme?.operations.run?.requests).toMatchObject([
      { id: 'health', label: '起動確認（200）', method: 'GET' },
      { id: 'list', label: '項目一覧（200）', method: 'GET' },
      { id: 'create', label: '項目登録（201）', method: 'POST' },
      { id: 'bad-request', label: '名前なしで登録（400）', method: 'POST' },
      { id: 'unauthorized', label: '認証情報なし（401）', method: 'GET' },
      { id: 'forbidden', label: '権限不足（403）', method: 'GET' },
      { id: 'not-found', label: '存在しないURL（404）', method: 'GET' },
      { id: 'method-not-allowed', label: '許可されていないHTTPメソッド（405）', method: 'POST' },
      { id: 'payload-too-large', label: '大きすぎる本文（413）', method: 'POST' },
      { id: 'unsupported-media-type', label: '対応していないContent-Type（415）', method: 'POST' },
      { id: 'server-error', label: 'API内部のエラー（500）', method: 'GET' },
      { id: 'bad-gateway', label: '接続先サービスのエラー（502）', method: 'GET' }
    ]);
    expect(theme?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'api-source', label: 'サンプルAPIのソース' }),
      expect.objectContaining({ id: 'get-examples', label: 'GET確認コマンド' }),
      expect.objectContaining({ id: 'api-check-log', label: 'API確認ログ' }),
      expect.objectContaining({ id: 'requirements', label: '要件定義' })
    ]));
    expect(readThemeResource(theme!, 'api-source', 'actual').content)
      .toContain("return sendJson(res, 502, { error: 'upstream_service_unavailable' });");
  });

  it('base10の学習項目を状態コードごとの確認へ分ける', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'base10');

    expect(checklist).toMatchObject({
      revision: 2,
      items: [
        expect.objectContaining({ label: expect.stringContaining('状態コード200') }),
        expect.objectContaining({ label: expect.stringContaining('状態コード201') }),
        expect.objectContaining({ label: expect.stringContaining('状態コード400') }),
        expect.objectContaining({ label: expect.stringContaining('401と403') }),
        expect.objectContaining({ label: expect.stringContaining('404と405') }),
        expect.objectContaining({ label: expect.stringContaining('状態コード413') }),
        expect.objectContaining({ label: expect.stringContaining('状態コード415') }),
        expect.objectContaining({ label: expect.stringContaining('500と502') }),
        expect.objectContaining({ label: expect.stringContaining('API確認ログ') })
      ]
    });
  });

  it('base11をポートフォリオ説明の作成画面と関連資料へ接続する', () => {
    const theme = loadActualCatalog().themeById.get('base11');

    expect(theme).toMatchObject({
      name: 'ポートフォリオのデモ・説明',
      integrationMode: 'embedded',
      actualConnection: {
        type: 'static-web',
        root: 'category/StudyBase/src/apps/base11_portfolio_demo_presentation/app',
        entryFile: 'index.html'
      }
    });
    expect(theme?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'presentation-case', label: '説明対象の記入例' }),
      expect.objectContaining({ id: 'completed-presentation', label: 'ポートフォリオ説明の完成例' }),
      expect.objectContaining({ id: 'script-60', label: '60秒の説明ひな形' }),
      expect.objectContaining({ id: 'presentation-source', label: '説明案の作成処理' }),
      expect.objectContaining({ id: 'requirements', label: '要件定義' })
    ]));
    expect(readThemeResource(theme!, 'presentation-source', 'actual').content)
      .toContain('buildPresentationArtifacts');
  });

  it('base11の学習項目を説明時間、証拠、制限、録画構成へ分ける', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'base11');

    expect(checklist).toMatchObject({
      revision: 2,
      items: [
        expect.objectContaining({ label: expect.stringContaining('記入例') }),
        expect.objectContaining({ label: expect.stringContaining('60秒') }),
        expect.objectContaining({ label: expect.stringContaining('3分') }),
        expect.objectContaining({ label: expect.stringContaining('5分') }),
        expect.objectContaining({ label: expect.stringContaining('3件以内') }),
        expect.objectContaining({ label: expect.stringContaining('実装済みの事実') }),
        expect.objectContaining({ label: expect.stringContaining('録画構成') }),
        expect.objectContaining({ label: expect.stringContaining('作成処理') }),
        expect.objectContaining({ label: expect.stringContaining('完成例') })
      ]
    });
  });

  it('base12をarch01への案内文書と正規テーマの資料へ接続する', () => {
    const theme = loadActualCatalog().themeById.get('base12');

    expect(theme).toMatchObject({
      name: 'システム構成を読み解く入口（正規テーマはarch01）',
      integrationMode: 'document',
      actualConnection: {
        type: 'markdown',
        file: 'category/StudyBase/doc/learning_notes/base12_system_anatomy_walkthrough/README.md'
      }
    });
    expect(readActualThemeReadme(theme!).content).toContain('/themes/arch01?catalog=actual');
    expect(theme?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'arch01-readme', label: 'arch01の説明' }),
      expect.objectContaining({ id: 'arch01-example', label: 'arch01専用システムの整理例' }),
      expect.objectContaining({ id: 'arch01-components', label: '構成要素の整理' }),
      expect.objectContaining({ id: 'arch01-decisions', label: '構成判断の整理' }),
      expect.objectContaining({ id: 'requirements', label: '要件定義' })
    ]));
    expect(readThemeResource(theme!, 'arch01-example', 'actual').content)
      .toContain('arch01専用の注文登録システム');
  });

  it('base12の学習項目を案内確認だけに限定する', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'base12');

    expect(checklist).toMatchObject({
      revision: 2,
      items: [
        expect.objectContaining({ label: expect.stringContaining('案内入口') }),
        expect.objectContaining({ label: expect.stringContaining('正規テーマへ移動') }),
        expect.objectContaining({ label: expect.stringContaining('学習進捗もarch01') })
      ]
    });
  });

  it('db01を保存方式の比較資料と記入ひな形へ接続する', () => {
    const theme = loadActualCatalog().themeById.get('db01');

    expect(theme).toMatchObject({
      name: 'DB基礎と保存方式の選び方',
      presentation: 'document',
      lifecycle: 'none',
      integrationMode: 'document',
      actualConnection: {
        type: 'markdown',
        file: 'category/StudyDB/doc/learning_notes/db01_db_foundations/README.md'
      }
    });
    expect(theme?.resources).toHaveLength(7);
    expect(theme?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'storage-comparison', label: '保存方式を比較する' }),
      expect.objectContaining({ id: 'category-matrix', label: 'DBの種類を比較する' }),
      expect.objectContaining({ id: 'use-case-mapping', label: '用途ごとの選定例' }),
      expect.objectContaining({ id: 'selection-worksheet', label: '選定結果を記入する' }),
      expect.objectContaining({ id: 'requirements', label: '要件定義' })
    ]));
    expect(readActualThemeReadme(theme!).content).toContain('正本、派生データ、一時データ');
    expect(readThemeResource(theme!, 'selection-worksheet', 'actual').content)
      .toContain('注文履歴を正確に残す');
  });

  it('db01の学習項目を比較、選定、記入へ分ける', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'db01');

    expect(checklist).toMatchObject({
      revision: 2,
      items: [
        expect.objectContaining({ label: expect.stringContaining('ファイル、Excel') }),
        expect.objectContaining({ label: expect.stringContaining('RDB、文書型DB') }),
        expect.objectContaining({ label: expect.stringContaining('OLTP') }),
        expect.objectContaining({ label: expect.stringContaining('注文履歴') }),
        expect.objectContaining({ label: expect.stringContaining('正本、派生データ、一時データ') }),
        expect.objectContaining({ label: expect.stringContaining('採用しない理由') })
      ]
    });
  });

  it('db02をSQL準備・CRUD・結合・制約違反の個別操作へ接続する', () => {
    const theme = loadActualCatalog().themeById.get('db02');

    expect(theme).toMatchObject({
      name: 'SQLの基本操作とテーブル設計',
      presentation: 'command',
      lifecycle: 'stack',
      integrationStatus: 'connected'
    });
    expect(theme?.operations.start?.processes[0]).toMatchObject({
      command: 'docker',
      env: { STUDYDB_PORT: '0' },
      execution: 'task'
    });
    expect(theme?.operations.run?.commandOperations).toMatchObject([
      { id: 'prepare' },
      { id: 'crud' },
      { id: 'join' },
      { id: 'duplicate-email' },
      { id: 'missing-name' },
      { id: 'missing-customer' },
      { id: 'negative-price' },
      { id: 'zero-quantity' }
    ]);
    expect(theme?.operations.run?.commandOperations?.slice(3).every((operation) => (
      operation.processes[0]?.allowFailure === true
    ))).toBe(true);
    expect(theme?.resources).toHaveLength(11);
    expect(theme?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'schema-sql', label: 'テーブル定義SQL' }),
      expect.objectContaining({ id: 'join-sql', label: 'テーブル結合SQL' }),
      expect.objectContaining({ id: 'execution-record', label: '実行結果を記録する' }),
      expect.objectContaining({ id: 'constraint-record', label: '制約違反を記録する' })
    ]));
    expect(readThemeResource(theme!, 'schema-sql', 'actual').content)
      .toContain('CREATE TABLE customers');
  });

  it('db02の学習項目をSQL実行と5種類の制約確認へ分ける', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'db02');

    expect(checklist).toMatchObject({
      revision: 2,
      items: [
        expect.objectContaining({ label: expect.stringContaining('役割と関係') }),
        expect.objectContaining({ label: expect.stringContaining('初期データ') }),
        expect.objectContaining({ label: expect.stringContaining('SELECT、INSERT、UPDATE、DELETE') }),
        expect.objectContaining({ label: expect.stringContaining('INNER JOINとLEFT JOIN') }),
        expect.objectContaining({ label: expect.stringContaining('主キー、外部キー、一意制約、必須制約、値の制約') }),
        expect.objectContaining({ label: expect.stringContaining('制約に反するデータ') }),
        expect.objectContaining({ label: expect.stringContaining('予想した結果、実際の結果、その理由') })
      ]
    });
  });

  it('db03からdb07を画面内の資料と個別操作へ接続する', () => {
    const catalog = loadActualCatalog();
    const db03 = catalog.themeById.get('db03');
    const db04 = catalog.themeById.get('db04');
    const db05 = catalog.themeById.get('db05');
    const db06 = catalog.themeById.get('db06');
    const db07 = catalog.themeById.get('db07');

    expect(db03).toMatchObject({ name: '正規化とERモデリング' });
    expect(db03?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'unnormalized-table', label: '非正規な注文表' }),
      expect.objectContaining({ id: 'er-model', label: 'ERモデル' }),
      expect.objectContaining({ id: 'design-record', label: '設計結果を記録する' })
    ]));
    expect(readThemeResource(db03!, 'design-record', 'actual').content)
      .toContain('正規化の判断');
    expect(db04).toMatchObject({ name: 'トランザクション・ロック・分離レベル' });
    expect(db04?.operations.run?.commandOperations).toMatchObject([
      { id: 'prepare' },
      { id: 'commit-rollback' },
      { id: 'lock-observation' },
      { id: 'isolation' }
    ]);
    expect(db04?.operations.run?.commandOperations?.[2]?.processes[0]).toMatchObject({
      command: 'node',
      args: ['src/apps/db04_transaction_lock_isolation/scripts/lock-conflict-demo.mjs']
    });
    expect(db04?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'lock-holder-sql', label: '更新とロック確認のSQL' }),
      expect.objectContaining({ id: 'lock-waiter-sql', label: 'ROLLBACK後の状態確認SQL' }),
      expect.objectContaining({ id: 'concurrent-update-log', label: 'ロック観察記録' })
    ]));
    expect(db05).toMatchObject({ name: '索引・EXPLAIN・性能比較' });
    expect(db05?.operations.run?.commandOperations).toMatchObject([
      { id: 'prepare' },
      { id: 'explain-before' },
      { id: 'create-indexes' },
      { id: 'explain-after' },
      { id: 'ineffective-indexes' }
    ]);
    expect(db06).toMatchObject({ name: 'バックアップ・復元・マイグレーション' });
    expect(db06?.operations.run?.commandOperations).toMatchObject([
      { id: 'prepare' },
      { id: 'backup-restore' },
      { id: 'migration' }
    ]);
    expect(db07).toMatchObject({ name: 'NoSQL・キャッシュ・検索・DWH比較' });
    expect(db07?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'rdb-sample', label: 'RDB形式の例' }),
      expect.objectContaining({ id: 'dwh-sample', label: 'DWH向け売上データの例' }),
      expect.objectContaining({ id: 'rag-sample', label: 'RAG向けデータの例' }),
      expect.objectContaining({ id: 'selection-record', label: '選定判断の記録ひな形' })
    ]));
  });

  it('db03からdb07の学習項目を実際の確認単位へ分ける', () => {
    const checklists = loadActualCatalog().checklists;

    for (const themeId of ['db03', 'db04', 'db05', 'db06', 'db07']) {
      const checklist = checklists.find((item) => item.themeId === themeId);
      expect(checklist?.revision).toBe(['db03', 'db04', 'db07'].includes(themeId) ? 3 : 2);
      expect(checklist?.items.length).toBeGreaterThanOrEqual(5);
      expect(checklist?.items.every((item) => !/完了です|Dockerを使いません/.test(item.label))).toBe(true);
    }
  });

  it('保存処理を行うAWSテーマに一時フォルダを設定する', () => {
    const theme = loadActualCatalog().themeById.get('aws05');

    expect(theme?.operations.run?.commandOperations).toHaveLength(5);
    expect(theme?.operations.run?.commandOperations?.every((operation) =>
      operation.processes?.[0]?.command === 'node'
      && operation.processes[0].args?.[0] === 'app/storage.js'
      && operation.processes[0].temporaryDirectoryEnv === 'STUDYAWS_STORAGE_ROOT'
    )).toBe(true);
  });

  it('DB複合テーマに独立したDocker環境、SQL実行、後片付けを設定する', () => {
    const theme = loadActualCatalog().themeById.get('web51');

    expect(theme?.operations.start?.processes[0]).toMatchObject({
      command: 'docker',
      env: { STUDYDB_PORT: '0' },
      execution: 'task'
    });
    expect(theme?.operations.run?.commandOperations).toHaveLength(4);
    expect(theme?.operations.run?.commandOperations?.[0]?.processes[0]).toMatchObject({
      command: 'docker',
      stdinFile: expect.stringMatching(/schema\.sql$/)
    });
    expect(theme?.operations.start?.cleanup?.[0]).toMatchObject({
      command: 'docker',
      allowFailure: true
    });
  });

  it('aws04をDocker PostgreSQLへ実接続する複合テーマとして扱う', () => {
    const theme = loadActualCatalog().themeById.get('aws04');

    expect(theme).toMatchObject({
      presentation: 'command',
      lifecycle: 'stack',
      integrationStatus: 'connected'
    });
    expect(theme?.operations.start?.processes.map((process) => process.id)).toEqual([
      'previous-environment-cleanup', 'application-image', 'database'
    ]);
    expect(theme?.operations.run?.commandOperations?.[0]?.processes?.[0]).toMatchObject({
      command: 'docker',
      args: expect.arrayContaining(['app/db_check.js', 'successful-connection'])
    });
    expect(theme?.operations.start?.cleanup?.[0]).toMatchObject({
      command: 'docker',
      allowFailure: true
    });
  });

  it('複合Webテーマに画面URL、起動確認、対象限定の後片付けを設定する', () => {
    const theme = loadActualCatalog().themeById.get('web19');

    expect(theme?.operations.start?.processes[0]).toMatchObject({
      command: 'docker',
      execution: 'task',
      url: 'http://localhost:5179/',
      healthUrl: 'http://127.0.0.1:13019/tasks'
    });
    expect(theme?.operations.start?.cleanup?.[0]).toMatchObject({
      command: 'docker',
      allowFailure: true
    });
    expect(theme?.operations.run?.commandOperations).toMatchObject([
      { id: 'stop-service' },
      { id: 'start-service' },
      { id: 'service-status' },
      { id: 'service-logs' }
    ]);
  });

  it('web19からweb24に画面動作と対応する実ソースを設定する', () => {
    const catalog = loadActualCatalog();

    expect(catalog.themeById.get('web19')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'frontend-app', 'backend-controller', 'backend-main', 'compose'
    ]);
    expect(catalog.themeById.get('web20')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'frontend-app', 'create-dto', 'backend-controller', 'backend-service', 'prisma-schema', 'compose'
    ]);
    expect(catalog.themeById.get('web21')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'frontend-app', 'debug-controller', 'compose'
    ]);
    expect(catalog.themeById.get('web22')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'frontend-main', 'frontend-app', 'tasks-api', 'backend-controller', 'compose'
    ]);
    expect(catalog.themeById.get('web23')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'root-layout', 'home-page', 'about-page', 'tasks-page'
    ]);
    expect(catalog.themeById.get('web24')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'root-layout', 'home-page', 'tasks-page'
    ]);
    const checklistByTheme = new Map(catalog.checklists.map((checklist) => [checklist.themeId, checklist]));
    expect(checklistByTheme.get('web19')?.items[2]?.label).toContain('通信を許可するヘッダー');
    expect(checklistByTheme.get('web20')?.items[0]?.label).toContain('空白だけ');
    expect(checklistByTheme.get('web23')?.items[3]?.label).toContain('ページ全体を再読み込みせず');
    expect(checklistByTheme.get('web24')?.items[3]?.label).toContain('fetchTasks');
    expect(checklistByTheme.get('web24')?.items[4]?.label).toContain('取得失敗');
  });

  it('web25からweb28に学習操作と対応する実ソースを設定する', () => {
    const catalog = loadActualCatalog();

    expect(catalog.themeById.get('web25')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'form-client', 'server-action', 'page'
    ]);
    expect(catalog.themeById.get('web26')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'frontend', 'api-controller', 'db-service', 'initial-data', 'compose'
    ]);
    expect(catalog.themeById.get('web27')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'web-page', 'nginx-config', 'api-server', 'compose'
    ]);
    expect(catalog.themeById.get('web28')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'frontend', 'backend', 'env-sample', 'compose'
    ]);
    expect(catalog.themeById.get('web26')?.operations.run?.commandOperations?.map((operation) => operation.id))
      .toContain('database-tasks');
    expect(catalog.themeById.get('web26')?.operations.start?.cleanup?.[0]?.args)
      .not.toContain('--volumes');
    expect(catalog.themeById.get('web27')?.operations.run?.commandOperations?.map((operation) => operation.id))
      .toContain('nginx-logs');
    expect(catalog.themeById.get('web28')?.operations.run?.commandOperations?.map((operation) => operation.id))
      .toEqual(expect.arrayContaining(['config-validation-tests', 'missing-required-value']));

    const checklistByTheme = new Map(catalog.checklists.map((checklist) => [checklist.themeId, checklist]));
    expect(checklistByTheme.get('web25')?.items[3]?.label).toContain('同じページ');
    expect(checklistByTheme.get('web26')?.items[3]?.label).toContain('APIを再起動');
    expect(checklistByTheme.get('web27')?.items[3]?.label).toContain('HTTP 502');
    expect(checklistByTheme.get('web28')?.items[2]?.label).toContain('検証テスト');
  });

  it('HTTP・Cookie・状態コードのテーマにREADMEと対応する複数API操作を設定する', () => {
    const catalog = loadActualCatalog();

    expect(catalog.themeById.get('web32')?.operations.run?.requests).toMatchObject([
      { id: 'get-hello', method: 'GET' },
      { id: 'post-echo', method: 'POST' },
      { id: 'not-found', method: 'GET' }
    ]);
    expect(catalog.themeById.get('web33')?.operations.run?.requests).toMatchObject([
      { id: 'me-before-login', method: 'GET' },
      { id: 'login', method: 'POST' },
      { id: 'me', method: 'GET' },
      { id: 'logout', method: 'POST' },
      { id: 'me-after-logout', method: 'GET' }
    ]);
    expect(catalog.themeById.get('web35')?.operations.run?.requests).toMatchObject([
      { id: 'list', method: 'GET', url: 'http://127.0.0.1:43335/items' },
      {
        id: 'create',
        method: 'POST',
        url: 'http://127.0.0.1:43335/items',
        inputs: [{ name: 'name', target: 'body', required: true }]
      },
      { id: 'bad-request', method: 'POST', url: 'http://127.0.0.1:43335/items' },
      { id: 'unauthorized', method: 'GET' },
      { id: 'forbidden', method: 'GET' },
      { id: 'not-found', method: 'GET' },
      {
        id: 'conflict',
        method: 'POST',
        url: 'http://127.0.0.1:43335/items',
        inputs: [{ name: 'name', target: 'body', required: true }]
      },
      { id: 'server-error', method: 'GET' }
    ]);

    expect(catalog.themeById.get('web32')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'server-source',
      'observation-log',
      'devtools-check',
      'curl-check'
    ]);
    expect(catalog.themeById.get('web33')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'server-source',
      'cookie-check',
      'session-flow'
    ]);
    expect(catalog.themeById.get('web35')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'api-source',
      'status-matrix',
      'curl-examples'
    ]);
  });

  it('検索・再送・非同期処理・障害比較のテーマに必要な操作を設定する', () => {
    const catalog = loadActualCatalog();

    expect(catalog.themeById.get('web42')?.operations.run?.requests?.[0]?.inputs).toHaveLength(6);
    expect(catalog.themeById.get('web43')?.operations.run?.requests).toHaveLength(5);
    expect(catalog.themeById.get('web48')?.operations.run?.requests).toMatchObject([
      { id: 'create' },
      { id: 'create-failed' },
      { id: 'status' },
      { id: 'missing' }
    ]);
    expect(catalog.themeById.get('web49')?.operations.run?.requests).toMatchObject([
      { id: 'success' },
      { id: 'slow', timeoutMilliseconds: 1000 },
      {
        id: 'temporary',
        retry: { maxAttempts: 3, delayMilliseconds: 100, statusCodes: [503] }
      },
      { id: 'permanent' }
    ]);
    expect(catalog.themeById.get('web50')?.operations.run?.requests).toHaveLength(2);
    expect(catalog.themeById.get('web50')?.operations.run?.requests?.[0]?.inputs).toMatchObject([
      { name: 'count', target: 'query' }
    ]);
  });

  it('web48からweb51に画面操作と対応する資料・実ソースを設定する', () => {
    const catalog = loadActualCatalog();

    expect(catalog.themeById.get('web48')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'job-state', 'polling-flow', 'server-source', 'server-test'
    ]);
    expect(catalog.themeById.get('web49')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'retry-policy', 'timeout-check', 'server-source', 'server-test'
    ]);
    expect(catalog.themeById.get('web50')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'n-plus-one-note',
      'query-comparison',
      'server-source',
      'query-source',
      'prisma-schema',
      'server-test'
    ]);
    expect(catalog.themeById.get('web51')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'index-comparison', 'explain-note', 'schema-sql', 'seed-sql'
    ]);

    const checklistByTheme = new Map(catalog.checklists.map((checklist) => [checklist.themeId, checklist]));
    expect(checklistByTheme.get('web48')).toMatchObject({ revision: 5 });
    expect(checklistByTheme.get('web48')?.items[6]?.label).toContain('自動pollingせず');
    expect(checklistByTheme.get('web49')?.items[2]?.label).toContain('503、503、200');
    expect(checklistByTheme.get('web50')).toMatchObject({ revision: 4 });
    expect(checklistByTheme.get('web50')?.items[2]?.label).toContain('親データを増やし');
    expect(checklistByTheme.get('web51')?.items[1]?.label).toContain('Index Scan');

    expect(readThemeResource(catalog.themeById.get('web48')!, 'server-source', 'actual').content)
      .toContain('sample_processing_failed');
    expect(readThemeResource(catalog.themeById.get('web49')!, 'server-source', 'actual').content)
      .toContain('function createServer');
    expect(readThemeResource(catalog.themeById.get('web50')!, 'server-source', 'actual').content)
      .toContain('new PrismaClient');
    expect(readThemeResource(catalog.themeById.get('web50')!, 'query-source', 'actual').content)
      .toContain('include: { tasks');
    expect(readThemeResource(catalog.themeById.get('web51')!, 'schema-sql', 'actual').content)
      .toContain('create table products');
  });

  it('web41からweb46に画面操作と対応する資料・実ソースを設定する', () => {
    const catalog = loadActualCatalog();

    expect(catalog.themeById.get('web41')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'error-format', 'error-mapping', 'api-source'
    ]);
    expect(catalog.themeById.get('web42')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'query-parameters', 'response-format', 'api-source'
    ]);
    expect(catalog.themeById.get('web43')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'duplicate-check', 'idempotency-flow', 'api-source'
    ]);
    expect(catalog.themeById.get('web44')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'transition-table', 'transition-check', 'transition-source'
    ]);
    expect(catalog.themeById.get('web45')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'conflict-flow', 'lock-check', 'lock-source', 'server-source'
    ]);
    expect(catalog.themeById.get('web46')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'csv-format', 'import-result', 'csv-source', 'server-source', 'valid-csv', 'invalid-csv'
    ]);
    expect(catalog.themeById.get('web45')?.actualConnection).toMatchObject({
      type: 'web-process',
      command: 'node',
      args: ['server.js'],
      url: 'http://127.0.0.1:43345/',
      healthUrl: 'http://127.0.0.1:43345/api/record'
    });
    expect(catalog.themeById.get('web46')?.actualConnection).toMatchObject({
      type: 'web-process',
      command: 'node',
      args: ['server.js'],
      url: 'http://127.0.0.1:43346/',
      healthUrl: 'http://127.0.0.1:43346/api/health'
    });

    const checklistByTheme = new Map(catalog.checklists.map((checklist) => [checklist.themeId, checklist]));
    expect(checklistByTheme.get('web41')).toMatchObject({ revision: 4 });
    expect(checklistByTheme.get('web41')?.items[2]?.label).toContain('フロント表示例');
    expect(checklistByTheme.get('web42')).toMatchObject({ revision: 5 });
    expect(checklistByTheme.get('web42')?.items[1]?.label).toContain('200');
    expect(checklistByTheme.get('web43')).toMatchObject({ revision: 4 });
    expect(checklistByTheme.get('web43')?.items[2]?.label).toContain('idempotency_key_payload_conflict');
    expect(checklistByTheme.get('web43')?.items[4]?.label).toContain('停止して再起動');
    expect(checklistByTheme.get('web44')?.items[3]?.label).toContain('allowed');
    expect(checklistByTheme.get('web45')).toMatchObject({ revision: 5 });
    expect(checklistByTheme.get('web45')?.items[1]?.label).toContain('HTTP 409');
    expect(checklistByTheme.get('web45')?.items[4]?.label).toContain('一つの要求');
    expect(checklistByTheme.get('web46')).toMatchObject({ revision: 5 });
    expect(checklistByTheme.get('web46')?.items[1]?.label).toContain('価格が数値でない');
    expect(checklistByTheme.get('web46')?.items[4]?.label).toContain('送信中');

    expect(readThemeResource(catalog.themeById.get('web44')!, 'transition-source', 'actual').content)
      .toContain('const allowed');
    expect(readThemeResource(catalog.themeById.get('web45')!, 'lock-source', 'actual').content)
      .toContain("request('/api/record'");
    expect(readThemeResource(catalog.themeById.get('web45')!, 'lock-source', 'actual').content)
      .toContain('nameInput.value.trim()');
    expect(readThemeResource(catalog.themeById.get('web45')!, 'server-source', 'actual').content)
      .toContain("sendJson(response, 409");
    expect(readThemeResource(catalog.themeById.get('web46')!, 'csv-source', 'actual').content)
      .toContain("form.append('file'");
    expect(readThemeResource(catalog.themeById.get('web46')!, 'csv-source', 'actual').content)
      .toContain('if (sending) return');
    expect(readThemeResource(catalog.themeById.get('web46')!, 'server-source', 'actual').content)
      .toContain('function validateCsv');
  });

  it('web34でCORS拒否・許可APIと画面を同時起動する', () => {
    const catalog = loadActualCatalog();
    const theme = catalog.themeById.get('web34');

    expect(theme?.operations.start?.processes).toMatchObject([
      { id: 'backend-deny', env: { PORT: '3035' } },
      { id: 'backend-allow', env: { PORT: '3036', ALLOW_CORS: '1' } },
      { id: 'frontend', url: 'http://127.0.0.1:3034/' }
    ]);
    expect(theme?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'comparison-screen',
      'cors-api',
      'cors-failure',
      'cors-success'
    ]);

    const checklistByTheme = new Map(catalog.checklists.map((checklist) => [checklist.themeId, checklist]));
    expect(checklistByTheme.get('web34')?.items[2]?.label).toContain('許可しないAPI');
    expect(checklistByTheme.get('web34')?.items[4]?.label).toContain('Cookie');
    expect(readThemeResource(theme!, 'cors-api', 'actual').content)
      .toContain("'Access-Control-Allow-Credentials': 'true'");
  });

  it('web36からweb39に画面と実装を対応づける関連ファイルを設定する', () => {
    const catalog = loadActualCatalog();

    expect(catalog.themeById.get('web36')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'page-source',
      'storage-source',
      'storage-check',
      'storage-risk'
    ]);
    expect(catalog.themeById.get('web37')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'page-source',
      'form-source',
      'validation-rules',
      'form-state'
    ]);
    expect(catalog.themeById.get('web38')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'page-source',
      'route-source',
      'route-table',
      'navigation-check'
    ]);
    expect(catalog.themeById.get('web39')?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual([
      'page-source',
      'fallback-source',
      'behavior-note'
    ]);

    const checklistByTheme = new Map(catalog.checklists.map((checklist) => [checklist.themeId, checklist]));
    expect(checklistByTheme.get('web36')).toMatchObject({ revision: 4 });
    expect(checklistByTheme.get('web36')?.items[2]?.label).toContain('sessionStorage');
    expect(checklistByTheme.get('web38')).toMatchObject({ revision: 4 });
    expect(checklistByTheme.get('web39')).toMatchObject({ revision: 4 });
    expect(checklistByTheme.get('web38')?.items[0]?.label).toContain('削除確認');
    expect(checklistByTheme.get('web39')?.items[2]?.label).toContain('もう一度表示する');
    expect(readThemeResource(catalog.themeById.get('web36')!, 'storage-source', 'actual').content)
      .toContain('sessionStorage');
    expect(readThemeResource(catalog.themeById.get('web38')!, 'route-source', 'actual').content)
      .toContain('HashRouter');
    expect(readThemeResource(catalog.themeById.get('web38')!, 'route-source', 'actual').content)
      .toContain('useParams');
    expect(readThemeResource(catalog.themeById.get('web39')!, 'fallback-source', 'actual').content)
      .toContain('getDerivedStateFromError');
    expect(readThemeResource(catalog.themeById.get('web39')!, 'fallback-source', 'actual').content)
      .toContain('componentDidCatch');
  });

  it('StudyAIテーマに共有環境とテーマ固有の画面URLを設定する', () => {
    const first = loadActualCatalog().themeById.get('system01');
    const second = loadActualCatalog().themeById.get('system17');

    expect(first?.operations.start).toMatchObject({
      runtimeId: 'actual-study-ai-shared',
      processes: [
        { id: 'database', command: 'docker', execution: 'task' },
        { id: 'migration', command: 'docker', execution: 'task' },
        { id: 'applications', url: 'http://127.0.0.1:15173/system01' }
      ]
    });
    expect(second?.operations.start).toMatchObject({
      runtimeId: 'actual-study-ai-shared',
      processes: expect.arrayContaining([
        expect.objectContaining({
          id: 'applications',
          url: 'http://127.0.0.1:15173/system17'
        })
      ])
    });
    expect(first?.operations.stop).toEqual({ mode: 'release' });
  });

  it('base08をGiteaと安全な一時Git環境のPR手順へ接続する', () => {
    const theme = loadActualCatalog().themeById.get('base08');

    expect(theme).toMatchObject({
      name: 'Issue・ブランチ・Pull Request・マージ・同期',
      presentation: 'web',
      lifecycle: 'stack',
      integrationStatus: 'connected',
      material: { openMode: 'new-window' },
      environment: { required: ['Docker Desktop', 'Git', 'Node.js'] },
      actualConnection: {
        type: 'web-stack',
        cwd: 'category/StudyBase'
      }
    });
    expect(theme?.operations.start?.processes).toMatchObject([
      {
        id: 'gitea',
        command: 'docker',
        url: 'http://127.0.0.1:3418/',
        healthUrl: 'http://127.0.0.1:3418/api/healthz'
      },
      { id: 'gitea-ready', command: 'docker' }
    ]);
    expect(theme?.operations.start?.cleanup?.[0]).toMatchObject({
      id: 'compose-down',
      allowFailure: true
    });
    expect(theme?.operations.start?.cleanup?.[0]?.args).not.toContain('--volumes');
    expect(theme?.operations.run?.commandOperations).toMatchObject([
      { id: 'local-workflow', label: 'Issueからマージ後の同期までを確認' },
      { id: 'gitea-status', label: 'Giteaの状態を確認' },
      { id: 'gitea-logs', label: 'Giteaのログを確認' },
      { id: 'validate-materials', label: '教材ファイルを検証' }
    ]);
    expect(theme?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'issue-example', label: 'Issue記入例' }),
      expect.objectContaining({ id: 'gitea-guide', label: 'Gitea実操作手順' }),
      expect.objectContaining({ id: 'compose-source', label: 'GiteaのCompose定義' }),
      expect.objectContaining({ id: 'practice-script', label: 'PR手順練習スクリプト' })
    ]));
    expect(readThemeResource(theme!, 'practice-script', 'actual').content)
      .toContain("'all-steps'");
  });

  it('base08の学習項目をIssueから同期とGitea操作へ分ける', () => {
    const checklist = loadActualCatalog().checklists.find((item) => item.themeId === 'base08');

    expect(checklist).toMatchObject({
      revision: 2,
      items: [
        expect.objectContaining({ label: expect.stringContaining('Issueに目的') }),
        expect.objectContaining({ label: expect.stringContaining('作業ブランチ') }),
        expect.objectContaining({ label: expect.stringContaining('Pull Request') }),
        expect.objectContaining({ label: expect.stringContaining('レビュー指摘') }),
        expect.objectContaining({ label: expect.stringContaining('サーバー側のmain') }),
        expect.objectContaining({ label: expect.stringContaining('pull --ff-only') }),
        expect.objectContaining({ label: expect.stringContaining('Giteaの起動') })
      ]
    });
  });

  it('システム構成と設計レビューのテーマに整理用資料と具体的な学習項目を持つ', () => {
    const catalog = loadActualCatalog();
    const arch01 = catalog.themeById.get('arch01');
    const arch02 = catalog.themeById.get('arch02');
    const arch01Checklist = catalog.checklists.find((item) => item.themeId === 'arch01');
    const arch02Checklist = catalog.checklists.find((item) => item.themeId === 'arch02');

    expect(arch01).toMatchObject({
      name: 'システム構成の読み解き',
      resources: expect.arrayContaining([
        expect.objectContaining({ id: 'server-source', label: 'API・SQLite・ログ処理' }),
        expect.objectContaining({ id: 'components', label: '構成要素の整理' }),
        expect.objectContaining({ id: 'request-data-flow', label: '処理とデータの流れ' })
      ]),
      actualConnection: expect.objectContaining({
        type: 'web-process',
        cwd: 'category/StudyArchitecture/src/apps/arch01_system_anatomy_walkthrough',
        args: ['app/server.js'],
        url: 'http://127.0.0.1:43701/',
        healthUrl: 'http://127.0.0.1:43701/ready'
      })
    });
    expect(arch02).toMatchObject({
      name: '証拠に基づく設計レビュー',
      resources: expect.arrayContaining([
        expect.objectContaining({ id: 'playwright-test', label: 'Playwright証拠取得テスト' }),
        expect.objectContaining({ id: 'review-target-design', label: 'レビュー対象の期待仕様' }),
        expect.objectContaining({ id: 'review-target', label: 'レビュー対象と範囲' }),
        expect.objectContaining({ id: 'curl-evidence', label: 'curlによるAPI証拠' }),
        expect.objectContaining({ id: 'evidence-mapping', label: '主張と証拠の対応' }),
        expect.objectContaining({ id: 'findings', label: '指摘の書き方' }),
        expect.objectContaining({ id: 'review-result-template', label: 'レビュー結果のひな形' })
      ]),
      actualConnection: expect.objectContaining({
        type: 'web-process',
        cwd: 'category/StudyArchitecture/src/apps/arch02_evidence_driven_design_review',
        args: ['app/server.js'],
        url: 'http://127.0.0.1:43702/',
        healthUrl: 'http://127.0.0.1:43702/ready'
      })
    });
    expect(arch01Checklist).toMatchObject({ revision: 3 });
    expect(arch01Checklist?.items).toHaveLength(7);
    expect(arch02Checklist).toMatchObject({ revision: 4 });
    expect(arch02Checklist?.items).toHaveLength(8);
  });

  it('ElectronテーマにGUIの直接起動と停止を設定する', () => {
    const catalog = loadActualCatalog();
    const theme = catalog.themeById.get('desktop01');
    const checklist = catalog.checklists.find((item) => item.themeId === 'desktop01');

    expect(theme?.name).toBe('Electronによるローカル環境構築の自動化');
    expect(theme?.operations.start).toMatchObject({
      runtimeId: 'actual-desktop01',
      processes: [{
        id: 'external-app',
        command: 'electron',
        args: ['--disable-gpu-sandbox', '.']
      }]
    });
    expect(theme?.operations.stop).toEqual({ mode: 'managed' });
    expect(theme?.environment.required).toContain('デスクトップセッション');
    expect(theme?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'ipc-flow', label: '画面とメイン処理の連携' }),
      expect.objectContaining({ id: 'allowlist-source', label: '許可処理一覧のソース' }),
      expect.objectContaining({ id: 'safety-tests', label: '安全性テストのソース' })
    ]));
    expect(checklist).toMatchObject({ revision: 3 });
    expect(checklist?.items).toHaveLength(8);
  });

  it('単独アプリ4件に画面内で確認できる資料と個別操作を設定する', () => {
    const catalog = loadActualCatalog();
    const ideaForge = catalog.themeById.get('study-idea-forge');
    const ideaGeneration = catalog.themeById.get('study-ai-idea-generation');
    const corporateEmployee = catalog.themeById.get('study-ai-corporate-employee');
    const studyApi = catalog.themeById.get('study-api');

    expect(ideaForge?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'backend-api', label: 'APIと画面配信のソース' }),
      expect.objectContaining({ id: 'graph-engine', label: '発想手順を動かすソース' }),
      expect.objectContaining({ id: 'database-tests', label: 'SQLite保存処理のテスト' })
    ]));
    expect(ideaGeneration?.operations.run?.commandOperations?.map((operation) => operation.id))
      .toEqual(expect.arrayContaining([
        'check-default', 'check-baseline', 'check-variant', 'check-lmstudio',
        'generate-baseline', 'generate-variant', 'unit-tests'
      ]));
    for (const operation of ideaGeneration?.operations.run?.commandOperations ?? []) {
      expect(operation.processes).toHaveLength(1);
      expect(operation.processes[0]).toMatchObject({ command: 'python' });
      expect(operation.processes[0].args.slice(0, 2)).toEqual(['-X', 'utf8']);
    }
    expect(ideaGeneration?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'baseline-input', label: '基準となる入力' }),
      expect.objectContaining({ id: 'comparison-template', label: '生成結果の比較表' }),
      expect.objectContaining({ id: 'verification-source', label: '構造確認と生成処理のソース' })
    ]));
    expect(corporateEmployee).toMatchObject({ name: '役割別AIアシスタントの権限設計' });
    expect(corporateEmployee?.operations.run?.commandOperations).toMatchObject([
      { id: 'validate-profiles', label: '役割定義と権限設定を検証' },
      { id: 'unit-tests', label: '検証処理のテストを実行' }
    ]);
    for (const operation of corporateEmployee?.operations.run?.commandOperations ?? []) {
      expect(operation.processes).toHaveLength(1);
      expect(operation.processes[0]).toMatchObject({ command: 'python' });
      expect(operation.processes[0].args.slice(0, 2)).toEqual(['-X', 'utf8']);
    }
    expect(corporateEmployee?.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'hr-role', label: '人事アシスタントの役割定義' }),
      expect.objectContaining({ id: 'sales-permissions', label: '営業アシスタントの権限設定' }),
      expect.objectContaining({ id: 'evaluation-cases', label: '評価に使う依頼例' })
    ]));
    expect(studyApi?.operations.run?.requests).toMatchObject([
      { id: 'health', method: 'GET' },
      { id: 'fixed-response', method: 'GET' },
      { id: 'cors-preflight', method: 'OPTIONS' },
      { id: 'ask-lmstudio', method: 'POST' },
      { id: 'missing-prompt', method: 'POST' },
      { id: 'invalid-json', method: 'POST' },
      { id: 'json-array', method: 'POST' },
      { id: 'prompt-too-large', method: 'POST' },
      { id: 'wrong-content-type', method: 'POST' },
      { id: 'upstream-unavailable', method: 'POST' },
      { id: 'get-ask', method: 'GET' },
      { id: 'not-found', method: 'GET' }
    ]);
    expect(studyApi?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id)).toEqual(['api-source', 'api-tests']);

    for (const themeId of [
      'study-idea-forge', 'study-ai-idea-generation', 'study-ai-corporate-employee', 'study-api'
    ]) {
      const checklist = catalog.checklists.find((item) => item.themeId === themeId);
      expect(checklist).toMatchObject({ revision: expect.any(Number) });
      expect(checklist?.items).toHaveLength(6);
    }
  });

  it('すべてのテーマが存在する教材入口を持つ', () => {
    const catalog = loadActualCatalog();

    expect(catalog.themes.every((theme) => theme.entryFile?.startsWith('category/'))).toBe(true);
  });

  it('devops01からdevops10に画面内資料とテーマ固有の操作を設定する', () => {
    const catalog = loadActualCatalog();
    const devops01 = catalog.themeById.get('devops01');
    const devops02 = catalog.themeById.get('devops02');
    const devops03 = catalog.themeById.get('devops03');
    const devops04 = catalog.themeById.get('devops04');
    const devops05 = catalog.themeById.get('devops05');
    const devops06 = catalog.themeById.get('devops06');
    const devops07 = catalog.themeById.get('devops07');
    const devops08 = catalog.themeById.get('devops08');
    const devops09 = catalog.themeById.get('devops09');
    const devops10 = catalog.themeById.get('devops10');

    expect(devops01?.name).toBe('GitHub Actionsによるビルド確認');
    expect(devops01?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id))
      .toEqual(['app-source', 'package-scripts', 'workflow', 'workflow-source', 'dockerfile']);
    expect(devops01?.operations.run?.commandOperations).toMatchObject([
      { id: 'build-check', label: 'ローカルでビルドを確認' }
    ]);

    expect(devops02?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id))
      .toEqual([
        'calculator-source', 'unit-tests', 'lint-script', 'package-scripts',
        'failure-examples', 'dockerfile', 'workflow-source'
      ]);
    expect(devops02?.operations.run?.commandOperations?.map((operation) => operation.id))
      .toEqual(['lint', 'unit-test', 'quality-check']);

    expect(devops03?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id))
      .toEqual(['api-source', 'api-tests', 'compose-source', 'workflow-source']);
    expect(devops03?.operations.start?.processes?.[0]).toMatchObject({
      id: 'build',
      args: ['compose', '--parallel', '1', '-p', 'studyhub-devops03', 'build', 'api', 'test']
    });
    expect(devops04?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id))
      .toEqual(['form-server', 'e2e-tests', 'playwright-config', 'package-scripts', 'dockerfile', 'workflow-source']);
    expect(devops05?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id))
      .toEqual(['database-tests', 'schema-source', 'seed-source', 'compose-source', 'workflow-source']);

    const workflow = readThemeResource(devops01!, 'workflow-source', 'actual').content;
    expect(workflow).not.toContain('\nconcurrency:');
    expect(workflow).toContain('api-integration:\n    name: API integration test\n    needs: node-quality');
    expect(workflow).toContain('browser-e2e:\n    name: Playwright E2E test\n    needs: api-integration');
    expect(workflow).toContain('database-integration:\n    name: PostgreSQL integration test\n    needs: browser-e2e');
    expect(workflow).toContain('operations-signals:\n    name: Logging, health, and incident evidence\n    needs: database-integration');
    expect(readThemeResource(devops02!, 'failure-examples', 'actual').content)
      .toContain('lintと単体テストの失敗ログを再現する');
    expect(readThemeResource(devops04!, 'playwright-config', 'actual').content)
      .toContain('fullyParallel: false');
    expect(readThemeResource(devops04!, 'playwright-config', 'actual').content)
      .toContain('workers: 1');

    expect(devops06?.operations.run?.requests?.map((request) => request.id))
      .toEqual(['health', 'normal-request', 'failed-request', 'unsafe-request-id']);
    expect(devops06?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id))
      .toEqual(['server-source', 'logger-source', 'logging-tests', 'dockerfile', 'workflow-source']);
    expect(devops07?.operations.run?.requests?.map((request) => request.id))
      .toEqual(['health', 'ready', 'stop-dependency', 'not-ready', 'restore-dependency']);
    expect(devops07?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id))
      .toEqual(['server-source', 'health-tests', 'compose-source', 'dockerfile', 'workflow-source']);
    expect(devops08?.operations.run?.commandOperations?.map((operation) => operation.id))
      .toEqual([
        'container-status', 'normal-response', 'container-diagnostics',
        'missing-env-logs', 'runtime-error-logs', 'signal-tests'
      ]);
    expect(devops08?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id))
      .toEqual([
        'server-source', 'signal-tests', 'compose-source', 'investigation-template',
        'port-conflict-guide', 'normal-request-source', 'runtime-request-source',
        'diagnostics-source', 'dockerfile', 'workflow-source'
      ]);
    expect(readThemeResource(devops08!, 'port-conflict-guide', 'actual').content)
      .toContain('PIDだけを根拠にprocessを停止しません');
    expect(devops09?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id))
      .toContain('workflow-source');
    expect(devops10?.resources?.filter((resource) => !formalDocumentResourceIds.has(resource.id)).map((resource) => resource.id))
      .toContain('workflow-source');

    for (const themeId of ['devops01', 'devops02', 'devops03', 'devops04', 'devops05']) {
      const checklist = catalog.checklists.find((item) => item.themeId === themeId);
      expect(checklist).toMatchObject({ revision: 3 });
      expect(checklist?.items.length).toBeGreaterThanOrEqual(5);
    }

    for (const themeId of ['devops06', 'devops07', 'devops08', 'devops09', 'devops10']) {
      const checklist = catalog.checklists.find((item) => item.themeId === themeId);
      expect(checklist).toMatchObject({ revision: 3 });
      expect(checklist?.items.length).toBeGreaterThanOrEqual(7);
    }
  });
});
