import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCatalogs, repositoryRoot, sampleDataRoot } from '../catalog/loader.js';
import { RuntimeManager } from '../runtime/manager.js';
import { registerApi } from './api.js';

let app: FastifyInstance;
let runtimeManager: RuntimeManager;
const catalogs = loadCatalogs();

async function injectActualThemes(themeIds: string[]) {
  const responses = [];
  for (const themeId of themeIds) {
    responses.push(await app.inject({
      method: 'GET',
      url: `/api/themes/${themeId}?catalog=actual`
    }));
  }
  return responses;
}

const formalDocumentResourceIds = new Set(['requirements', 'basic-design', 'detailed-design']);

function themeSpecificResources<T extends { id: string }>(resources: T[]): T[] {
  return resources.filter((resource) => !formalDocumentResourceIds.has(resource.id));
}

beforeEach(async () => {
  app = Fastify();
  runtimeManager = new RuntimeManager(sampleDataRoot, repositoryRoot);
  await registerApi(app, catalogs, runtimeManager);
  await app.ready();
});

afterEach(async () => {
  await runtimeManager.stopAll();
  await app.close();
});

describe('カタログ読取API', () => {
  it('分野一覧を共通応答形式で返す', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/fields' });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.data.fields).toHaveLength(5);
  });

  it('存在しない分野をエラーコード付きで返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/fields/not-found/themes'
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'FIELD_NOT_FOUND',
        message: '分野が見つかりません。'
      }
    });
  });

  it('実分野のREADMEを返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/fields/study-ai/readme?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({
      format: 'markdown',
      entryFile: 'category/StudyAI/README.md'
    });
    expect(response.json().data.content).toContain('# StudyAI');
  });

  it('疑似分野では実分野READMEを返さない', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/fields/sample-web/readme?catalog=sample'
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('README_NOT_AVAILABLE');
  });

  it('実分野に登録された検証処理を実行する', async () => {
    vi.spyOn(runtimeManager, 'checkField').mockResolvedValue({
      result: { ok: true, exitCode: 0, output: 'validation ok' },
      logs: [{
        sequence: 1,
        time: '2026-08-25T00:00:00.000Z',
        source: 'validator',
        level: 'info',
        message: 'validation ok'
      }]
    });
    const response = await app.inject({
      method: 'POST',
      url: '/api/fields/study-ai/check?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.report).toMatchObject({
      result: { ok: true, exitCode: 0 },
      logs: [expect.objectContaining({ message: 'validation ok' })]
    });
    expect(runtimeManager.checkField).toHaveBeenCalledWith(expect.objectContaining({ id: 'study-ai' }));
  });

  it('疑似分野では分野検証を実行しない', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/fields/sample-web/check?catalog=sample'
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('FIELD_CHECK_NOT_AVAILABLE');
  });

  it('実分野の準備状態を確認する', async () => {
    vi.spyOn(runtimeManager, 'inspectFieldReadiness').mockResolvedValue({
      fieldId: 'study-ai',
      checkedAt: '2026-08-25T00:00:00.000Z',
      ready: true,
      items: [{ id: 'node', label: 'Node.js', status: 'ready', message: 'v22' }]
    });
    const response = await app.inject({
      method: 'POST',
      url: '/api/fields/study-ai/readiness?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.report).toMatchObject({
      fieldId: 'study-ai',
      ready: true,
      items: [expect.objectContaining({ id: 'node', status: 'ready' })]
    });
    expect(runtimeManager.inspectFieldReadiness).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'study-ai' }),
      expect.arrayContaining([expect.objectContaining({ fieldId: 'study-ai' })])
    );
  });

  it('疑似分野では準備状態を確認しない', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/fields/sample-web/readiness?catalog=sample'
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('FIELD_READINESS_NOT_AVAILABLE');
  });

  it('存在しないテーマをエラーコード付きで返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/not-found'
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('THEME_NOT_FOUND');
  });

  it('実テーマのチェック設定を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/checklists?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.checklists).toHaveLength(167);
    expect(response.json().data.checklists).toEqual(expect.arrayContaining([
      expect.objectContaining({
        themeId: 'web01',
        fieldId: 'study-web',
        items: expect.arrayContaining([
          expect.objectContaining({ id: 'check-01' }),
          expect.objectContaining({ id: 'check-02' }),
          expect.objectContaining({ id: 'check-04' })
        ])
      }),
      expect.objectContaining({
        themeId: 'system01',
        fieldId: 'study-ai',
        revision: 3,
        items: expect.arrayContaining([
          expect.objectContaining({ label: expect.stringContaining('抽出実行画面') }),
          expect.objectContaining({ label: expect.stringContaining('一括ジョブ確認画面') }),
          expect.objectContaining({ label: expect.stringContaining('抽出プロンプト') })
        ])
      })
    ]));
  });

  it('疑似テーマのチェック設定を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/checklists?catalog=sample'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.checklists).toHaveLength(11);
    expect(response.json().data.checklists).toEqual(expect.arrayContaining([
      expect.objectContaining({
        themeId: 'sample-static-web',
        fieldId: 'sample-web',
        items: expect.arrayContaining([
          expect.objectContaining({ id: 'check-01' }),
          expect.objectContaining({ id: 'check-03' })
        ])
      })
    ]));
  });

  it('実カタログから分野別のテーマ一覧を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/fields/study-ai/themes?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.themes).toHaveLength(48);
    expect(response.json().data.themes[0].integrationStatus).toBe('connected');
    expect(response.json().data.themes[0].integrationMode).toBe('embedded');
    expect(response.json().data.themes[0]).not.toHaveProperty('operations');
    expect(response.json().data.themes[0]).not.toHaveProperty('actualConnection');
  });

  it('StudyWebの一覧に棚グループと準備条件を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/fields/study-web/themes?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.themes).toHaveLength(52);
    expect(response.json().data.themes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'web01',
        environment: [],
        group: expect.objectContaining({ id: 'web-foundations', order: 10 })
      }),
      expect.objectContaining({
        id: 'web19',
        environment: expect.arrayContaining(['Docker Desktop']),
        group: expect.objectContaining({ id: 'web-api-database', order: 30 })
      })
    ]));
  });

  it('StudySecurityの一覧にグループ、操作数、状態引継ぎを返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/fields/study-security/themes?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.themes).toHaveLength(21);
    expect(response.json().data.themes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'security01',
        operationCount: 6,
        group: expect.objectContaining({ id: 'security-auth-authorization', order: 10 }),
        listProfile: {
          interactionMode: 'stateful-sequence',
          initialization: '起動時にSessionを初期化'
        }
      }),
      expect.objectContaining({
        id: 'security05',
        operationCount: 2,
        group: expect.objectContaining({ id: 'security-input-browser-secrets', order: 20 })
      })
    ]));
  });

  it('StudyDBの一覧にグループ、操作数、専用環境、停止時の影響を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/fields/study-db/themes?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.themes).toHaveLength(7);
    expect(response.json().data.themes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'db01',
        operationCount: 0,
        group: expect.objectContaining({ id: 'db-foundation-modeling', order: 10 })
      }),
      expect.objectContaining({
        id: 'db02',
        operationCount: 8,
        group: expect.objectContaining({ id: 'db-sql-consistency-performance', order: 20 }),
        listProfile: {
          interactionMode: 'stateful-sequence',
          initialization: '最初にスキーマと初期データを準備',
          environmentScope: 'db02専用のDocker DB',
          cleanupImpact: '停止時にdb02のDBコンテナとボリュームを削除'
        }
      }),
      expect.objectContaining({
        id: 'db06',
        group: expect.objectContaining({ id: 'db-operation-change-recovery', order: 30 })
      })
    ]));
  });

  it('StudyAWSの一覧に分類、操作数、ローカル確認範囲を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/fields/study-aws/themes?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.themes).toHaveLength(10);
    expect(response.json().data.themes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'aws01',
        operationCount: 4,
        group: expect.objectContaining({ id: 'aws-permission-network', order: 10 }),
        listProfile: expect.objectContaining({
          environmentScope: 'ローカルのポリシー判定（実AWS不使用）'
        })
      }),
      expect.objectContaining({
        id: 'aws03',
        operationCount: 5,
        group: expect.objectContaining({ id: 'aws-compute-database-config', order: 20 }),
        listProfile: {
          interactionMode: 'stateful-sequence',
          initialization: '起動時に疑似サーバーを作成',
          environmentScope: 'ローカルDockerコンテナ（実EC2不使用）',
          cleanupImpact: '停止時にaws03のコンテナを削除'
        }
      }),
      expect.objectContaining({
        id: 'aws10',
        group: expect.objectContaining({ id: 'aws-deploy-recovery', order: 50 }),
        listProfile: expect.objectContaining({
          environmentScope: '専用一時フォルダの復旧演習（実AWS不使用）'
        })
      })
    ]));
  });

  it('StudyDevOpsの一覧に分類、実行場所、停止影響、関連テーマを返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/fields/study-devops/themes?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.themes).toHaveLength(10);
    expect(response.json().data.themes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'devops01',
        group: expect.objectContaining({ id: 'devops-ci-automated-test', order: 10 }),
        listProfile: expect.objectContaining({
          environmentScope: 'ローカルNode.js（GitHub Actions本体はGitHub上で確認）'
        })
      }),
      expect.objectContaining({
        id: 'devops08',
        operationCount: 6,
        group: expect.objectContaining({ id: 'devops-observability-incident', order: 20 }),
        listProfile: expect.objectContaining({
          interactionMode: 'stateful-sequence',
          cleanupImpact: '停止時にdevops08のDocker環境を削除'
        })
      }),
      expect.objectContaining({
        id: 'devops10',
        group: expect.objectContaining({ id: 'devops-operation-record-release', order: 30 }),
        listProfile: expect.objectContaining({
          relationshipNote: 'arch02は設計レビュー、devops10はリリース直前の運用判定を扱う独立テーマ'
        })
      })
    ]));
  });

  it('StudyBaseの一覧に分類、成果物、実行環境、関連テーマを返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/fields/study-base/themes?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.themes).toHaveLength(12);
    expect(response.json().data.themes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'base01',
        group: expect.objectContaining({ id: 'base-upstream-management-documents', order: 10 }),
        listProfile: expect.objectContaining({
          outputNote: 'ヒアリングメモ・要件定義入力メモ'
        })
      }),
      expect.objectContaining({
        id: 'base08',
        operationCount: 4,
        group: expect.objectContaining({ id: 'base-git-workflow', order: 20 }),
        listProfile: expect.objectContaining({
          environmentScope: 'base08専用Docker Gitea',
          cleanupImpact: '停止時にGiteaコンテナを削除（データ用ボリュームは保持）'
        })
      }),
      expect.objectContaining({
        id: 'base12',
        group: expect.objectContaining({ id: 'base-explanation-structure', order: 40 }),
        listProfile: expect.objectContaining({
          relationshipNote: '正規テーマはarch01（StudyArchitecture）'
        })
      })
    ]));
  });

  it('StudyArchitectureの一覧に学習順、成果物、独立した実行環境を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/fields/study-architecture/themes?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.themes).toHaveLength(2);
    expect(response.json().data.themes).toEqual([
      expect.objectContaining({
        id: 'arch01',
        group: expect.objectContaining({ id: 'architecture-system-understanding', order: 10 }),
        listProfile: expect.objectContaining({
          environmentScope: 'arch01専用Node.js・SQLite実行環境',
          outputNote: 'SQLite保存結果・処理ログ・障害と復旧の確認結果・構成判断メモ'
        })
      }),
      expect.objectContaining({
        id: 'arch02',
        group: expect.objectContaining({ id: 'architecture-design-review', order: 20 }),
        listProfile: expect.objectContaining({
          environmentScope: 'arch02専用Node.js・SQLite実行環境',
          outputNote: '画面・API・DB・ログ・ヘルスの証拠とSQLiteへ保存したレビュー結果'
        })
      })
    ]);
  });

  it('StudyDesktopの一覧に外部Electronアプリの準備、環境、停止範囲を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/fields/study-desktop/themes?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.themes).toEqual([
      expect.objectContaining({
        id: 'desktop01',
        group: expect.objectContaining({ id: 'desktop-electron-automation', order: 10 }),
        listProfile: {
          interactionMode: 'stateful-sequence',
          initialization: '初回のみテーマフォルダでnpm ciとnpm run setup:electronを手動実行',
          environmentScope: 'ローカルNode.jsとElectronのデスクトップセッション',
          cleanupImpact: '停止時に起動中のElectronアプリを終了',
          outputNote: '画面の状態遷移・実行ログ・一時作業フォルダの後片付け結果'
        }
      })
    ]);
  });

  it('StudyIdeaForgeの一覧にLLMなしの確認範囲と任意のLM Studio接続を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/fields/study-idea-forge/themes?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.themes).toEqual([
      expect.objectContaining({
        id: 'study-idea-forge',
        group: expect.objectContaining({ id: 'idea-forge-workflow-application', order: 10 }),
        listProfile: {
          interactionMode: 'stateful-sequence',
          initialization: '最初にテーマのPython仮想環境を準備。LLMなしで画面と保存を確認可能',
          environmentScope: 'テーマのPython仮想環境とSQLite。LLM使用時のみLM Studio（127.0.0.1:5858/v1）',
          cleanupImpact: '停止時にIdeaForgeのFastAPIを終了（SQLiteデータは保持）',
          outputNote: '発想手順・セッション状態・生成レポート'
        }
      })
    ]);
  });

  it('StudyAIIdeaGenerationの一覧にLM Studio不要・必要の操作範囲と比較成果物を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/fields/study-ai-idea-generation/themes?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.themes).toEqual([
      expect.objectContaining({
        id: 'study-ai-idea-generation',
        operationCount: 7,
        group: expect.objectContaining({ id: 'ai-idea-method-comparison', order: 10 }),
        listProfile: {
          interactionMode: 'multiple-actions',
          initialization: '構造確認と単体テストはLM Studio不要。接続確認・実生成前に127.0.0.1:5858/v1を起動',
          environmentScope: 'ローカルPython。接続確認・実生成時のみLM Studio',
          cleanupImpact: '各コマンドは完了時に終了（LM StudioはStudyHubから停止しない）',
          relationshipNote: 'StudyAIの生成AI実験を、5つの発想法の比較演習で補完',
          outputNote: '基準条件・変更条件の生成結果と比較表'
        }
      })
    ]);
  });

  it('StudyAICorporateEmployeeの一覧に設定検証とClaude Code実応答比較の範囲を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/fields/study-ai-corporate-employee/themes?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.themes).toEqual([
      expect.objectContaining({
        id: 'study-ai-corporate-employee',
        operationCount: 2,
        group: expect.objectContaining({ id: 'ai-corporate-role-permission-evaluation', order: 10 }),
        listProfile: {
          interactionMode: 'multiple-actions',
          initialization: '設定検証と単体テストはClaude Code不要。実応答を比較するときだけ各役割フォルダでClaude Codeを起動',
          environmentScope: 'ローカルPython。実応答の比較時のみClaude Code',
          cleanupImpact: '各Pythonコマンドは完了時に終了（Claude CodeはStudyHubから停止しない）',
          relationshipNote: 'StudyAIの業務支援・エージェント学習を、役割・権限境界・評価の演習で補完',
          outputNote: '役割別の回答・確認・人間への引き継ぎ・拒否結果と評価表'
        }
      })
    ]);
  });

  it('StudyAPIの一覧にHTTP状態確認と任意のLM Studio中継の範囲を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/fields/study-api/themes?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.themes).toEqual([
      expect.objectContaining({
        id: 'study-api',
        operationCount: 12,
        group: expect.objectContaining({ id: 'python-http-status-and-upstream', order: 10 }),
        listProfile: {
          interactionMode: 'multiple-actions',
          initialization: '204・200・400・404・405・413・415・502の確認はLM Studio不要。POST /askの正常中継時だけ127.0.0.1:5858を起動',
          environmentScope: 'ローカルPython。正常なLLM中継時のみLM Studio',
          cleanupImpact: '停止時にStudyAPIのHTTPサーバーを終了（LM StudioはStudyHubから停止しない）',
          relationshipNote: 'StudyWebのNestJS・API教材を、Python標準ライブラリ実装と入力制限の確認で補完',
          outputNote: '204・200・400・404・405・413・415・502の状態、応答ヘッダー、JSON本文'
        }
      })
    ]);
  });

  it('StudyAIの一覧に8分類と共有・文書・個別コマンドの実行環境を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/fields/study-ai/themes?catalog=actual'
    });
    const themes = response.json().data.themes;

    expect(response.statusCode).toBe(200);
    expect(themes).toHaveLength(48);
    expect(new Set(themes.map((theme: { group: { id: string } }) => theme.group.id)).size).toBe(8);
    expect(themes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'system01',
        group: expect.objectContaining({ id: 'ai-document-information', order: 10 }),
        listProfile: expect.objectContaining({
          environmentScope: 'StudyAI共有Docker環境（actual-study-ai-shared）',
          cleanupImpact: '停止時に共有環境を停止（他のStudyAIテーマにも影響、DBボリュームは保持）'
        })
      }),
      expect.objectContaining({
        id: 'system15',
        group: expect.objectContaining({ id: 'ai-ebook-integration-plan', order: 30 }),
        listProfile: expect.objectContaining({
          interactionMode: 'stateful-sequence',
          environmentScope: 'ローカルNode.js・Python・LM Studio・Tesseract OCR'
        })
      }),
      expect.objectContaining({
        id: 'system45',
        group: expect.objectContaining({ id: 'ai-development-operations', order: 80 }),
        listProfile: expect.objectContaining({
          environmentScope: 'ローカルNode.js（テーマ固有のコマンド実行）'
        })
      })
    ]));
  });

  it('接続済みの実テーマのREADMEをUTF-8で返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/system15/readme?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.format).toBe('markdown');
    expect(response.json().data.entryFile).toMatch(/^category\//);
    expect(response.json().data.content.length).toBeGreaterThan(0);
  });

  it('web01の既存READMEを返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/web01/readme?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.entryFile).toMatch(/web01_static_first_page\/README\.md$/);
    expect(response.json().data.content).toContain('HTML、CSS、JavaScriptの役割分担');
  });

  it('system01の学習READMEを説明文書として返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/system01/readme?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.entryFile).toMatch(/system01_invoice_receipt_extraction\/README\.md$/);
    expect(response.json().data.content).toContain('AIが抽出した項目を確認・訂正する流れ');
  });

  it('system01の画面・API・中心処理・テストを関連ファイルとして返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/system01?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.theme.resources.filter((resource: { id: string }) => !formalDocumentResourceIds.has(resource.id)).map((resource: { id: string }) => resource.id)).toEqual([
      'screen-source',
      'api-routes',
      'extract-prompt',
      'representative-test'
    ]);
  });

  it('system12の学習READMEと実装確認用ファイルを返す', async () => {
    const readmeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/system12/readme?catalog=actual'
    });
    const themeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/system12?catalog=actual'
    });

    expect(readmeResponse.statusCode).toBe(200);
    expect(readmeResponse.json().data.entryFile).toMatch(/system12_gift_recommendation\/README\.md$/);
    expect(readmeResponse.json().data.content).toContain('商品別の推薦回数と評価件数');
    expect(themeResponse.statusCode).toBe(200);
    expect(themeResponse.json().data.theme.resources.filter((resource: { id: string }) => !formalDocumentResourceIds.has(resource.id)).map((resource: { id: string }) => resource.id)).toEqual([
      'screen-source',
      'api-routes',
      'recommendation-graph',
      'representative-test'
    ]);
  });

  it('system15を既存CLIへ接続するWeb教材として返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/system15?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.theme).toMatchObject({
      presentation: 'web',
      entryFile: expect.stringMatching(/system15_ebook_section_summarization\/README\.md$/),
      resources: [
        expect.objectContaining({ id: 'bridge-screen', label: '電子書籍要約ジョブ画面' }),
        expect.objectContaining({ id: 'bridge-server', label: 'CLI連携・ジョブ保存API' }),
        expect.objectContaining({ id: 'bridge-test', label: 'CLI連携と永続化のテスト' }),
        expect.objectContaining({ id: 'current-specification', label: '現在の仕様' }),
        expect.objectContaining({ id: 'requirements', label: '要件定義' }),
        expect.objectContaining({ id: 'basic-design', label: '基本設計' }),
        expect.objectContaining({ id: 'detailed-design', label: '詳細設計' })
      ]
    });
    expect(response.json().data.theme.operations.start).toMatchObject({
      processes: [expect.objectContaining({
        command: 'node',
        args: ['app/server.js'],
        url: 'http://127.0.0.1:43715/',
        healthUrl: 'http://127.0.0.1:43715/health'
      })]
    });
  });

  it('system23の学習README・チェック項目・実装確認用ファイルを返す', async () => {
    const readmeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/system23/readme?catalog=actual'
    });
    const themeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/system23?catalog=actual'
    });
    const checklistsResponse = await app.inject({
      method: 'GET',
      url: '/api/checklists?catalog=actual'
    });

    expect(readmeResponse.statusCode).toBe(200);
    expect(readmeResponse.json().data.entryFile).toMatch(/system23_reranker_comparison\/README\.md$/);
    expect(readmeResponse.json().data.content).toContain('検索結果の並べ替え');
    expect(themeResponse.statusCode).toBe(200);
    expect(checklistsResponse.statusCode).toBe(200);
    expect(checklistsResponse.json().data.checklists).toEqual(expect.arrayContaining([
      expect.objectContaining({ themeId: 'system23', items: expect.arrayContaining([
        expect.objectContaining({ id: 'check-05' })
      ]) })
    ]));
    expect(themeResponse.json().data.theme.resources.filter((resource: { id: string }) => !formalDocumentResourceIds.has(resource.id)).map((resource: { id: string }) => resource.id)).toEqual([
      'screen-source',
      'api-routes',
      'experiment-service',
      'representative-test'
    ]);
  });

  it('system28の学習README・チェック項目・実装確認用ファイルを返す', async () => {
    const readmeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/system28/readme?catalog=actual'
    });
    const themeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/system28?catalog=actual'
    });
    const checklistsResponse = await app.inject({
      method: 'GET',
      url: '/api/checklists?catalog=actual'
    });

    expect(readmeResponse.statusCode).toBe(200);
    expect(readmeResponse.json().data.entryFile).toMatch(/system28_ocr_result_normalization\/README\.md$/);
    expect(readmeResponse.json().data.content).toContain('OCR文字列の正規化');
    expect(themeResponse.statusCode).toBe(200);
    expect(themeResponse.json().data.theme.resources.filter((resource: { id: string }) => !formalDocumentResourceIds.has(resource.id)).map((resource: { id: string }) => resource.id)).toEqual([
      'screen-source',
      'api-routes',
      'experiment-service',
      'representative-test'
    ]);
    expect(checklistsResponse.json().data.checklists).toEqual(expect.arrayContaining([
      expect.objectContaining({ themeId: 'system28', revision: 3, items: expect.arrayContaining([
        expect.objectContaining({ id: 'check-05' })
      ]) })
    ]));
  });

  it('system36の学習README・チェック項目・実装確認用ファイルを返す', async () => {
    const readmeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/system36/readme?catalog=actual'
    });
    const themeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/system36?catalog=actual'
    });
    const checklistsResponse = await app.inject({
      method: 'GET',
      url: '/api/checklists?catalog=actual'
    });

    expect(readmeResponse.statusCode).toBe(200);
    expect(readmeResponse.json().data.content).toContain('実行Traceの保存');
    expect(themeResponse.statusCode).toBe(200);
    expect(themeResponse.json().data.theme.name).toBe('実行Traceの作成');
    expect(themeResponse.json().data.theme.resources.filter((resource: { id: string }) => !formalDocumentResourceIds.has(resource.id)).map((resource: { id: string }) => resource.id)).toEqual([
      'screen-source',
      'api-routes',
      'experiment-service',
      'representative-test'
    ]);
    expect(checklistsResponse.json().data.checklists).toEqual(expect.arrayContaining([
      expect.objectContaining({ themeId: 'system36', revision: 3, items: expect.arrayContaining([
        expect.objectContaining({ id: 'check-05' })
      ]) })
    ]));
  });

  it('system37の学習README・チェック項目・実装確認用ファイルを返す', async () => {
    const readmeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/system37/readme?catalog=actual'
    });
    const themeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/system37?catalog=actual'
    });
    const checklistsResponse = await app.inject({
      method: 'GET',
      url: '/api/checklists?catalog=actual'
    });

    expect(readmeResponse.statusCode).toBe(200);
    expect(readmeResponse.json().data.content).toContain('取引実行型AIコンシェルジュ');
    expect(themeResponse.statusCode).toBe(200);
    expect(themeResponse.json().data.theme.resources.filter((resource: { id: string }) => !formalDocumentResourceIds.has(resource.id)).map((resource: { id: string }) => resource.id)).toEqual([
      'screen-source',
      'api-routes',
      'enterprise-service',
      'representative-test'
    ]);
    expect(checklistsResponse.json().data.checklists).toEqual(expect.arrayContaining([
      expect.objectContaining({ themeId: 'system37', revision: 3, items: expect.arrayContaining([
        expect.objectContaining({ id: 'check-05' }),
        expect.objectContaining({ id: 'check-07' })
      ]) })
    ]));
  });

  it('system44の学習README・チェック項目・実装確認用ファイルを返す', async () => {
    const readmeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/system44/readme?catalog=actual'
    });
    const themeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/system44?catalog=actual'
    });
    const checklistsResponse = await app.inject({
      method: 'GET',
      url: '/api/checklists?catalog=actual'
    });

    expect(readmeResponse.statusCode).toBe(200);
    expect(readmeResponse.json().data.content).toContain('AI KPI・実験評価ダッシュボード');
    expect(themeResponse.statusCode).toBe(200);
    expect(themeResponse.json().data.theme.resources.filter((resource: { id: string }) => !formalDocumentResourceIds.has(resource.id)).map((resource: { id: string }) => resource.id)).toEqual([
      'screen-source',
      'api-routes',
      'enterprise-service',
      'representative-test'
    ]);
    expect(checklistsResponse.json().data.checklists).toEqual(expect.arrayContaining([
      expect.objectContaining({ themeId: 'system44', revision: 4, items: expect.arrayContaining([
        expect.objectContaining({ id: 'check-05' })
      ]) })
    ]));
  });

  it('web29のREADMEひな形を関連ファイルとして返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/web29/resources/readme-template?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.resource).toMatchObject({
      id: 'readme-template',
      label: 'READMEひな形',
      kind: 'template',
      format: 'markdown'
    });
    expect(response.json().data.resource.content).toContain('# <テーマID> <テーマ名>');
  });

  it('web27のNginx転送設定を実ソースとして返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/web27/resources/nginx-config?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.resource).toMatchObject({
      id: 'nginx-config',
      label: 'Nginx転送設定',
      kind: 'source',
      format: 'source'
    });
    expect(response.json().data.resource.content).toContain('proxy_pass http://api:3000/');
  });

  it('web30のエラー記録ひな形を関連ファイルとして返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/web30/resources/error-log-template?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.resource).toMatchObject({
      id: 'error-log-template',
      label: 'エラー記録ひな形',
      kind: 'template',
      format: 'markdown'
    });
    expect(response.json().data.resource.content).toContain('## 確認した事実');
  });

  it('web31のGitea演習案内を関連ファイルとして返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/web31/resources/gitea-practice-entry?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.resource).toMatchObject({
      id: 'gitea-practice-entry',
      label: 'Gitea演習案内',
      kind: 'material',
      format: 'markdown'
    });
    expect(response.json().data.resource.content).toContain('テーマ番号: base08');
  });

  it('web40の一覧計算ソースを関連ファイルとして返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/web40/resources/table-state-source?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.resource).toMatchObject({
      id: 'table-state-source',
      label: '一覧計算',
      kind: 'source',
      format: 'source'
    });
    expect(response.json().data.resource.content).toContain('hasNext');
  });

  it('web41からweb46の追加資料と実ソースを関連ファイルとして返す', async () => {
    const web43Source = await app.inject({
      method: 'GET',
      url: '/api/themes/web43/resources/api-source?catalog=actual'
    });
    const web46Sample = await app.inject({
      method: 'GET',
      url: '/api/themes/web46/resources/valid-csv?catalog=actual'
    });

    expect(web43Source.statusCode).toBe(200);
    expect(web43Source.json().data.resource).toMatchObject({
      id: 'api-source',
      label: '二重登録を防ぐ処理',
      kind: 'source',
      format: 'source'
    });
    expect(web43Source.json().data.resource.content).toContain('idempotency-key');
    expect(web46Sample.statusCode).toBe(200);
    expect(web46Sample.json().data.resource).toMatchObject({
      id: 'valid-csv',
      label: '正しいCSVの例',
      kind: 'source',
      format: 'text'
    });
    expect(web46Sample.json().data.resource.content).toContain('P004,Ruler,150');
  });

  it('web19とweb23の実ソースを関連ファイルとして返す', async () => {
    const web19 = await app.inject({
      method: 'GET',
      url: '/api/themes/web19/resources/frontend-app?catalog=actual'
    });
    const web23 = await app.inject({
      method: 'GET',
      url: '/api/themes/web23/resources/root-layout?catalog=actual'
    });

    expect(web19.statusCode).toBe(200);
    expect(web19.json().data.resource).toMatchObject({
      id: 'frontend-app',
      label: '一覧画面',
      kind: 'source',
      format: 'source'
    });
    expect(web19.json().data.resource.content).toContain('setLoading(false)');
    expect(web23.statusCode).toBe(200);
    expect(web23.json().data.resource).toMatchObject({
      id: 'root-layout',
      label: '共通画面',
      kind: 'source',
      format: 'source'
    });
    expect(web23.json().data.resource.content).toContain('<Link href="/about">');
  });

  it('web47のファイル判定ソースを関連ファイルとして返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/web47/resources/validation-source?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.resource).toMatchObject({
      id: 'validation-source',
      label: 'ファイル判定',
      kind: 'source',
      format: 'source'
    });
    expect(response.json().data.resource.content).toContain('FILE_SIZE_LIMIT');
  });

  it('web49とweb51の実装・SQLを関連ファイルとして返す', async () => {
    const retrySource = await app.inject({
      method: 'GET',
      url: '/api/themes/web49/resources/server-source?catalog=actual'
    });
    const schemaSql = await app.inject({
      method: 'GET',
      url: '/api/themes/web51/resources/schema-sql?catalog=actual'
    });

    expect(retrySource.statusCode).toBe(200);
    expect(retrySource.json().data.resource.content).toContain('function createServer');
    expect(schemaSql.statusCode).toBe(200);
    expect(schemaSql.json().data.resource.content).toContain('create table products');
  });

  it('web52の判断メモ処理を関連ファイルとして返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/web52/resources/decision-source?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.resource).toMatchObject({
      id: 'decision-source',
      label: '判断メモ処理',
      kind: 'source',
      format: 'source'
    });
    expect(response.json().data.resource.content).toContain('validateMemo');
  });

  it('devops09の障害対応記録処理を関連ファイルとして返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/devops09/resources/report-source?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.resource).toMatchObject({
      id: 'report-source',
      label: '記録変換',
      kind: 'source',
      format: 'source'
    });
    expect(response.json().data.resource.content).toContain('buildMarkdown');
  });

  it('devops10のリリース判定処理を関連ファイルとして返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/devops10/resources/decision-source?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.resource).toMatchObject({
      id: 'decision-source',
      label: '判定記録変換',
      kind: 'source',
      format: 'source'
    });
    expect(response.json().data.resource.content).toContain('validateDecision');
  });

  it('base01のヒアリングメモ変換処理を関連ファイルとして返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/base01/resources/note-source?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.resource).toMatchObject({
      id: 'note-source',
      label: 'メモ変換',
      kind: 'source',
      format: 'source'
    });
    expect(response.json().data.resource.content).toContain('validateMemo');
  });

  it('base02の暫定成果物変換処理を関連ファイルとして返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/base02/resources/deliverable-source?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.resource).toMatchObject({
      id: 'deliverable-source',
      label: '文書変換',
      kind: 'source',
      format: 'source'
    });
    expect(response.json().data.resource.content).toContain('validateDeliverable');
  });

  it('base03の見積り変換処理を関連ファイルとして返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/base03/resources/estimate-source?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.resource).toMatchObject({
      id: 'estimate-source',
      label: '見積り変換',
      kind: 'source',
      format: 'source'
    });
    expect(response.json().data.resource.content).toContain('validateEstimate');
  });

  it('base04の成立条件判定処理を関連ファイルとして返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/base04/resources/preconditions-source?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.resource).toMatchObject({
      id: 'preconditions-source',
      label: '成立条件の判定と文書変換',
      kind: 'source',
      format: 'source'
    });
    expect(response.json().data.resource.content).toContain('validatePreconditions');
  });

  it('base05のRACI検証処理を関連ファイルとして返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/base05/resources/raci-source?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.resource).toMatchObject({
      id: 'raci-source',
      label: 'RACIの検証と文書変換',
      kind: 'source',
      format: 'source'
    });
    expect(response.json().data.resource.content).toContain('analyzeRaci');
  });

  it('base06のGit練習処理と状態別操作を返す', async () => {
    const themeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/base06?catalog=actual'
    });
    const resourceResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/base06/resources/practice-script?catalog=actual'
    });

    expect(themeResponse.statusCode).toBe(200);
    expect(themeResponse.json().data.theme.operations.run.commandOperations).toHaveLength(6);
    expect(themeResponse.json().data.theme.operations.run.commandOperations[0]).toMatchObject({
      id: 'clean-state',
      label: '変更前の状態を確認'
    });
    expect(resourceResponse.statusCode).toBe(200);
    expect(resourceResponse.json().data.resource).toMatchObject({
      id: 'practice-script',
      label: 'Git練習スクリプト',
      kind: 'source',
      format: 'source'
    });
    expect(resourceResponse.json().data.resource.content).toContain('initializeRepository');
  });

  it('base07の競合練習処理と段階別操作を返す', async () => {
    const themeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/base07?catalog=actual'
    });
    const resourceResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/base07/resources/practice-script?catalog=actual'
    });

    expect(themeResponse.statusCode).toBe(200);
    expect(themeResponse.json().data.theme.operations.run.commandOperations).toHaveLength(6);
    expect(themeResponse.json().data.theme.operations.run.commandOperations[2]).toMatchObject({
      id: 'conflict-reproduction',
      label: '競合を発生'
    });
    expect(resourceResponse.statusCode).toBe(200);
    expect(resourceResponse.json().data.resource).toMatchObject({
      id: 'practice-script',
      label: '競合練習スクリプト',
      kind: 'source',
      format: 'source'
    });
    expect(resourceResponse.json().data.resource.content).toContain('createConflict');
  });

  it('base08のGitea起動定義とPR手順操作を返す', async () => {
    const themeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/base08?catalog=actual'
    });
    const resourceResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/base08/resources/practice-script?catalog=actual'
    });

    expect(themeResponse.statusCode).toBe(200);
    expect(themeResponse.json().data.theme.material).toMatchObject({
      openMode: 'new-window'
    });
    expect(themeResponse.json().data.theme.operations.start.processes[0]).toMatchObject({
      id: 'gitea',
      command: 'docker',
      url: 'http://127.0.0.1:3418/'
    });
    expect(themeResponse.json().data.theme.operations.run.commandOperations).toHaveLength(4);
    expect(themeResponse.json().data.theme.operations.run.commandOperations[0]).toMatchObject({
      id: 'local-workflow',
      label: 'Issueからマージ後の同期までを確認'
    });
    expect(resourceResponse.statusCode).toBe(200);
    expect(resourceResponse.json().data.resource).toMatchObject({
      id: 'practice-script',
      label: 'PR手順練習スクリプト',
      kind: 'source',
      format: 'source'
    });
    expect(resourceResponse.json().data.resource.content).toContain('mergeAndSynchronize');
  });

  it('疑似テーマの関連ファイルも同じAPIで返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/sample-document/resources/document-source?catalog=sample'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.resource).toMatchObject({
      id: 'document-source',
      label: '文書表示のHTML',
      kind: 'source',
      format: 'source'
    });
    expect(response.json().data.resource.content).toContain('<!doctype html>');
  });

  it('登録されていない関連ファイルを404で返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/web29/resources/not-found?catalog=actual'
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('接続済みの静的Web教材と相対アセットを返す', async () => {
    const htmlResponse = await app.inject({
      method: 'GET',
      url: '/actual-materials/web04/index.html'
    });
    const scriptResponse = await app.inject({
      method: 'GET',
      url: '/actual-materials/web04/script.js'
    });

    expect(htmlResponse.statusCode).toBe(200);
    expect(htmlResponse.headers['content-type']).toContain('text/html');
    expect(htmlResponse.body).toContain('<!doctype html>');
    expect(scriptResponse.statusCode).toBe(200);
    expect(scriptResponse.headers['content-type']).toContain('text/javascript');
  });

  it('接続済みのWeb起動テーマに起動定義を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/web07?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.theme.operations.start.processes[0]).toMatchObject({
      command: 'node',
      url: 'http://127.0.0.1:43207/'
    });
  });

  it('接続済みのAPI起動テーマに起動定義とリクエスト定義を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/security03?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.theme.operations).toMatchObject({
      start: {
        processes: [{ env: { PORT: '4103' }, url: 'http://127.0.0.1:4103/demo' }]
      },
      run: {
        mode: 'request',
        requests: [
          { id: 'unauthenticated', method: 'GET' },
          { id: 'viewer-read', method: 'GET', headers: { 'X-User': 'v-viewer' } },
          { id: 'viewer-cancel', method: 'POST', headers: { 'X-User': 'v-viewer' } },
          { id: 'operator-cancel', method: 'POST', headers: { 'X-User': 'o-operator' } }
        ]
      }
    });
  });

  it('web13からweb15にREADMEと対応する確認操作を返す', async () => {
    const web13Response = await app.inject({
      method: 'GET',
      url: '/api/themes/web13?catalog=actual'
    });
    const web14Response = await app.inject({
      method: 'GET',
      url: '/api/themes/web14?catalog=actual'
    });
    const web15Response = await app.inject({
      method: 'GET',
      url: '/api/themes/web15?catalog=actual'
    });

    expect(web13Response.json().data.theme.operations.run.requests).toMatchObject([
      { id: 'hello', method: 'GET' },
      { id: 'not-found', method: 'GET' }
    ]);
    expect(web14Response.json().data.theme.operations.run.requests).toMatchObject([
      { id: 'valid-task', method: 'POST' },
      { id: 'empty-title', method: 'POST' },
      { id: 'unexpected-field', method: 'POST' }
    ]);
    expect(web15Response.json().data.theme.operations.run.requests).toMatchObject([
      { id: 'ok', method: 'GET' },
      { id: 'bad-request', method: 'GET' },
      { id: 'not-found', method: 'GET' },
      { id: 'server-error', method: 'GET' }
    ]);
  });

  it('StudyWebのAPI教材に複数の確認操作を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/web32?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.theme.operations.run.requests).toMatchObject([
      { id: 'get-hello', method: 'GET' },
      { id: 'post-echo', method: 'POST' },
      { id: 'not-found', method: 'GET' }
    ]);
    expect(response.json().data.theme.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'server-source', kind: 'source' }),
      expect.objectContaining({ id: 'observation-log', kind: 'template' })
    ]));

    const cookieResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/web33?catalog=actual'
    });
    expect(cookieResponse.statusCode).toBe(200);
    expect(cookieResponse.json().data.theme.operations.run.requests).toMatchObject([
      { id: 'me-before-login', method: 'GET' },
      { id: 'login', method: 'POST' },
      { id: 'me', method: 'GET' },
      { id: 'logout', method: 'POST' },
      { id: 'me-after-logout', method: 'GET' }
    ]);
  });

  it('StudyWebの画面教材に画面と処理を確認する関連ファイルを返す', async () => {
    const themeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/web38?catalog=actual'
    });
    const resourceResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/web38/resources/route-source?catalog=actual'
    });

    expect(themeResponse.statusCode).toBe(200);
    expect(themeResponse.json().data.theme.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'route-source', label: 'React RouterとCRUD処理' }),
      expect.objectContaining({ id: 'route-table', format: 'markdown' })
    ]));
    expect(resourceResponse.statusCode).toBe(200);
    expect(resourceResponse.json().data.resource.content).toContain('HashRouter');
  });

  it('接続済みのAPI・DBテーマにDocker起動定義と後片付けを返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/web16?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.theme.operations.start).toMatchObject({
      processes: [
        { command: 'docker', execution: 'task' },
        { command: 'docker', execution: 'task' },
        { command: 'docker', execution: 'task', url: 'http://127.0.0.1:13016/tasks' }
      ],
      cleanup: [{ command: 'docker', execution: 'task' }]
    });
    expect(response.json().data.theme.operations.run.requests).toMatchObject([
      { id: 'create', method: 'POST' },
      { id: 'list', method: 'GET' },
      { id: 'get', method: 'GET' },
      { id: 'update', method: 'PATCH' },
      { id: 'delete', method: 'DELETE' }
    ]);
  });

  it('関連データのテーマにユーザーとタスクの操作定義を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/web17?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.theme.operations.run.requests).toMatchObject([
      { id: 'create-user', method: 'POST', url: 'http://127.0.0.1:13017/users' },
      { id: 'list-users', method: 'GET', url: 'http://127.0.0.1:13017/users' },
      { id: 'get-user', method: 'GET', url: 'http://127.0.0.1:13017/users/{id}' },
      { id: 'create-task', method: 'POST', url: 'http://127.0.0.1:13017/tasks' },
      { id: 'list-tasks', method: 'GET', url: 'http://127.0.0.1:13017/tasks' }
    ]);
  });

  it('base09に個別のnpm script操作と関連ソースを返す', async () => {
    const themeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/base09?catalog=actual'
    });
    const resourceResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/base09/resources/package-json?catalog=actual'
    });

    expect(themeResponse.statusCode).toBe(200);
    expect(themeResponse.json().data.theme.operations.run).toMatchObject({
      mode: 'command',
      commandOperations: [
        { id: 'development', label: 'devを実行' },
        { id: 'build', label: 'buildを実行' },
        { id: 'test', label: 'testを実行' },
        { id: 'start', label: 'startを実行' },
        { id: 'missing-script', label: '存在しないscriptのエラーを確認' }
      ]
    });
    expect(resourceResponse.statusCode).toBe(200);
    expect(resourceResponse.json().data.resource).toMatchObject({
      id: 'package-json',
      label: 'package.json',
      kind: 'source',
      format: 'text'
    });
  });

  it('base10に状態コード別のAPI操作とサンプルAPIソースを返す', async () => {
    const themeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/base10?catalog=actual'
    });
    const resourceResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/base10/resources/api-source?catalog=actual'
    });

    expect(themeResponse.statusCode).toBe(200);
    expect(themeResponse.json().data.theme.operations.run.requests).toMatchObject([
      { id: 'health', method: 'GET' },
      { id: 'list', method: 'GET' },
      { id: 'create', method: 'POST' },
      { id: 'bad-request', method: 'POST' },
      { id: 'unauthorized', method: 'GET' },
      { id: 'forbidden', method: 'GET' },
      { id: 'not-found', method: 'GET' },
      { id: 'method-not-allowed', method: 'POST' },
      { id: 'payload-too-large', method: 'POST' },
      { id: 'unsupported-media-type', method: 'POST' },
      { id: 'server-error', method: 'GET' },
      { id: 'bad-gateway', method: 'GET' }
    ]);
    expect(resourceResponse.statusCode).toBe(200);
    expect(resourceResponse.json().data.resource).toMatchObject({
      id: 'api-source',
      label: 'サンプルAPIのソース',
      kind: 'source',
      format: 'source'
    });
    expect(resourceResponse.json().data.resource.content).toContain('upstream_service_unavailable');
  });

  it('base11に説明作成画面と説明案の作成処理を返す', async () => {
    const themeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/base11?catalog=actual'
    });
    const sourceResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/base11/resources/presentation-source?catalog=actual'
    });

    expect(themeResponse.statusCode).toBe(200);
    expect(themeResponse.json().data.theme).toMatchObject({
      id: 'base11',
      name: 'ポートフォリオのデモ・説明',
      integrationMode: 'embedded'
    });
    expect(themeResponse.json().data.theme.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'completed-presentation' }),
      expect.objectContaining({ id: 'script-60' }),
      expect.objectContaining({ id: 'presentation-source' })
    ]));
    expect(sourceResponse.statusCode).toBe(200);
    expect(sourceResponse.json().data.resource).toMatchObject({
      id: 'presentation-source',
      label: '説明案の作成処理',
      kind: 'source',
      format: 'source'
    });
    expect(sourceResponse.json().data.resource.content).toContain('buildPresentationArtifacts');
  });

  it('base12にarch01への案内と正規テーマ専用システムの整理例を返す', async () => {
    const themeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/base12?catalog=actual'
    });
    const readmeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/base12/readme?catalog=actual'
    });
    const exampleResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/base12/resources/arch01-example?catalog=actual'
    });

    expect(themeResponse.statusCode).toBe(200);
    expect(themeResponse.json().data.theme).toMatchObject({
      id: 'base12',
      name: 'システム構成を読み解く入口（正規テーマはarch01）',
      integrationMode: 'document'
    });
    expect(readmeResponse.statusCode).toBe(200);
    expect(readmeResponse.json().data.content).toContain('/themes/arch01?catalog=actual');
    expect(exampleResponse.statusCode).toBe(200);
    expect(exampleResponse.json().data.resource).toMatchObject({
      id: 'arch01-example',
      label: 'arch01専用システムの整理例',
      kind: 'artifact',
      format: 'markdown'
    });
    expect(exampleResponse.json().data.resource.content).toContain('arch01専用の注文登録システム');
  });

  it('db01に保存方式の比較資料と記入ひな形を返す', async () => {
    const themeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/db01?catalog=actual'
    });
    const readmeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/db01/readme?catalog=actual'
    });
    const comparisonResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/db01/resources/storage-comparison?catalog=actual'
    });
    const worksheetResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/db01/resources/selection-worksheet?catalog=actual'
    });

    expect(themeResponse.statusCode).toBe(200);
    expect(themeResponse.json().data.theme).toMatchObject({
      id: 'db01',
      name: 'DB基礎と保存方式の選び方',
      lifecycle: 'none',
      integrationMode: 'document'
    });
    expect(themeResponse.json().data.theme.resources).toHaveLength(7);
    expect(readmeResponse.statusCode).toBe(200);
    expect(readmeResponse.json().data.content).toContain('正本、派生データ、一時データ');
    expect(comparisonResponse.statusCode).toBe(200);
    expect(comparisonResponse.json().data.resource.content).toContain('オブジェクトストレージ');
    expect(worksheetResponse.statusCode).toBe(200);
    expect(worksheetResponse.json().data.resource).toMatchObject({
      id: 'selection-worksheet',
      label: '選定結果を記入する',
      kind: 'template',
      format: 'markdown'
    });
    expect(worksheetResponse.json().data.resource.content).toContain('障害時の復元元');
  });

  it('web18にMigration・Seed・DB確認の個別操作を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/web18?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    const operations = response.json().data.theme.operations;
    expect(operations.run).toMatchObject({
      mode: 'command',
      commandOperations: [
        { id: 'migration', label: 'Migrationを実行' },
        { id: 'migration-status', label: 'Migration状態を表示' },
        { id: 'seed', label: 'Seedを実行' },
        { id: 'database-contents', label: 'DB内容と件数を表示' }
      ]
    });
    expect(operations.run.commandOperations[0].processes[0].args)
      .toEqual(expect.arrayContaining(['migrate', 'deploy']));
    expect(response.json().data.theme.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'migration-source', label: 'DB変更履歴のSQL' })
    ]));
    expect(operations.start.cleanup[0].args).not.toContain('--volumes');
  });

  it('db02にSQL準備・CRUD・結合・制約違反の個別操作を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/db02?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    const operations = response.json().data.theme.operations;
    expect(operations.start).toMatchObject({
      processes: [{ command: 'docker', execution: 'task' }],
      cleanup: [{ command: 'docker', allowFailure: true }]
    });
    expect(operations.run).toMatchObject({
      mode: 'command',
      commandOperations: [
        { id: 'prepare' },
        { id: 'crud' },
        { id: 'join' },
        { id: 'duplicate-email' },
        { id: 'missing-name' },
        { id: 'missing-customer' },
        { id: 'negative-price' },
        { id: 'zero-quantity' }
      ]
    });
    expect(operations.run.commandOperations[0].processes).toMatchObject([
      { id: 'schema', command: 'docker' },
      { id: 'seed', command: 'docker' }
    ]);
    expect(operations.run.commandOperations.slice(3).every((operation: {
      processes: Array<{ allowFailure?: boolean }>;
    }) => operation.processes[0]?.allowFailure === true)).toBe(true);
    expect(operations.stop).toEqual({ mode: 'managed' });
  });

  it('db02のSQLと実行記録ひな形を教材APIから返す', async () => {
    const schemaResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/db02/resources/schema-sql?catalog=actual'
    });
    const recordResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/db02/resources/execution-record?catalog=actual'
    });

    expect(schemaResponse.statusCode).toBe(200);
    expect(schemaResponse.json().data.resource).toMatchObject({
      id: 'schema-sql',
      format: 'source'
    });
    expect(schemaResponse.json().data.resource.content).toContain('CREATE TABLE customers');
    expect(recordResponse.statusCode).toBe(200);
    expect(recordResponse.json().data.resource.content).toContain('予想した結果');
  });

  it('db03からdb07の個別操作と画面内資料を返す', async () => {
    const db03ResourceResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/db03/resources/design-record?catalog=actual'
    });
    const db04Response = await app.inject({
      method: 'GET',
      url: '/api/themes/db04?catalog=actual'
    });
    const db05Response = await app.inject({
      method: 'GET',
      url: '/api/themes/db05?catalog=actual'
    });
    const db06Response = await app.inject({
      method: 'GET',
      url: '/api/themes/db06?catalog=actual'
    });
    const db07ResourceResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/db07/resources/document-sample?catalog=actual'
    });

    expect(db03ResourceResponse.statusCode).toBe(200);
    expect(db03ResourceResponse.json().data.resource.content).toContain('ER表');
    expect(db04Response.statusCode).toBe(200);
    expect(db04Response.json().data.theme.operations.run.commandOperations).toMatchObject([
      { id: 'prepare' },
      { id: 'commit-rollback' },
      { id: 'lock-observation' },
      { id: 'isolation' }
    ]);
    expect(db05Response.json().data.theme.operations.run.commandOperations).toHaveLength(5);
    expect(db06Response.json().data.theme.operations.run.commandOperations).toHaveLength(3);
    expect(db07ResourceResponse.statusCode).toBe(200);
    expect(db07ResourceResponse.json().data.resource.content).toContain('order_id');
  });

  it('接続済みの複合Webテーマに表示URLと停止定義を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/web27?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    const operations = response.json().data.theme.operations;
    expect(operations.start.processes[0]).toMatchObject({
      command: 'docker',
      url: 'http://localhost:8087/',
      healthUrl: 'http://127.0.0.1:8087/api/health'
    });
    expect(operations.start.cleanup[0]).toMatchObject({
      command: 'docker',
      allowFailure: true
    });
    expect(operations.stop).toEqual({ mode: 'managed' });
  });

  it('StudyAIテーマに共有環境と個別画面の定義を返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/system23?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    const operations = response.json().data.theme.operations;
    expect(operations.start.runtimeId).toBe('actual-study-ai-shared');
    expect(operations.start.processes[2]).toMatchObject({
      id: 'applications',
      url: 'http://127.0.0.1:15173/system23'
    });
    expect(operations.stop).toEqual({ mode: 'release' });
  });

  it('system45からsystem48に選択式の操作と関連ファイルを返す', async () => {
    const responses = await injectActualThemes(['system45', 'system46', 'system47', 'system48']);

    expect(responses.every((response) => response.statusCode === 200)).toBe(true);
    const themes = responses.map((response) => response.json().data.theme);

    expect(themes[0].operations.run.commandOperations).toMatchObject([
      { id: 'valid-input', label: '正常な入力例を検証' },
      { id: 'missing-fields', label: '必須項目の不足を検出' },
      { id: 'sensitive-input', label: '秘密情報を含む入力を拒否' }
    ]);
    expect(themes[1].operations.run.commandOperations).toHaveLength(5);
    expect(themes[2].operations.run.commandOperations).toMatchObject([
      { id: 'monthly-sales', label: '月別売上をSQLで集計' },
      { id: 'product-sales', label: '商品別売上をSQLで集計' },
      { id: 'customer-sales', label: '顧客区分別売上をSQLで集計' },
      { id: 'ai-explanation', label: 'SQL集計をAIで説明' },
      { id: 'unsafe-sql', label: '更新SQLを拒否' }
    ]);
    expect(themes[2]).toMatchObject({
      lifecycle: 'stack',
      environment: { required: ['Docker Desktop', 'Node.js', 'LM Studio（5858番、チャット用モデル。SQL集計はLM Studio不要）'] },
      timeoutSeconds: 300
    });
    expect(themes[2].operations.start.processes.map((process: { id: string }) => process.id))
      .toEqual(['previous-environment-cleanup', 'database', 'schema', 'seed']);
    expect(themes[3].operations.run.commandOperations.slice(0, 4)).toMatchObject([
      { id: 'mock-success', label: '通常作業を模擬実行' },
      { id: 'mock-approval', label: '承認対象を模擬実行' },
      { id: 'mock-missing-context', label: '情報不足を模擬実行' },
      { id: 'local-llm', label: 'LM Studioで実行' }
    ]);
    expect(themes[3].operations.run.commandOperations).toHaveLength(10);
    expect(themes[3]).toMatchObject({
      environment: { required: ['Node.js', 'LM Studio（5858番、チャット用モデル。模擬実行はLM Studio不要）'] },
      timeoutSeconds: 1800
    });
    expect(themes.map((theme) => themeSpecificResources(theme.resources).length)).toEqual([4, 7, 14, 8]);
  });

  it('security01からsecurity04に認証・認可の比較操作と関連ファイルを返す', async () => {
    const themeIds = ['security01', 'security02', 'security03', 'security04'];
    const responses = await injectActualThemes(themeIds);
    const checklistsResponse = await app.inject({ method: 'GET', url: '/api/checklists?catalog=actual' });

    expect(responses.every((response) => response.statusCode === 200)).toBe(true);
    const themes = responses.map((response) => response.json().data.theme);

    expect(themes[0].operations.run.requests.map((request: { id: string }) => request.id))
      .toEqual(['before-login', 'invalid-login', 'login', 'after-login', 'logout', 'after-logout']);
    expect(themes[1].operations.run.requests.map((request: { id: string }) => request.id))
      .toEqual(['invalid-login', 'issue-token', 'valid-token', 'tampered-token', 'expired-token', 'missing-token']);
    expect(themes[2].operations.run.requests.map((request: { id: string }) => request.id))
      .toEqual(['unauthenticated', 'viewer-read', 'viewer-cancel', 'operator-cancel']);
    expect(themes[3].operations.run.requests.map((request: { id: string }) => request.id)).toEqual([
      'unauthenticated',
      'alice-read-sales',
      'alice-update-draft',
      'alice-read-updated',
      'bob-read-sales',
      'bob-read-support',
      'bob-update-confirmed',
      'admin-read-support',
      'missing-order'
    ]);
    const checklists = checklistsResponse.json().data.checklists
      .filter((checklist: { themeId: string }) => themeIds.includes(checklist.themeId));
    expect(checklists.map((checklist: { revision: number }) => checklist.revision)).toEqual([3, 3, 3, 3]);
    expect(checklists.map((checklist: { items: unknown[] }) => checklist.items.length)).toEqual([6, 6, 6, 6]);
  });

  it('security05からsecurity08に入力・SQL・CSRF・XSSの確認操作と関連ファイルを返す', async () => {
    const themeIds = ['security05', 'security06', 'security07', 'security08'];
    const responses = await injectActualThemes(themeIds);

    expect(responses.every((response) => response.statusCode === 200)).toBe(true);
    const themes = responses.map((response) => response.json().data.theme);
    expect(themes[0].operations.run.commandOperations.map((operation: { id: string }) => operation.id))
      .toEqual(['validation-demo', 'boundary-tests']);
    expect(themes[1].operations.run.commandOperations.map((operation: { id: string }) => operation.id))
      .toEqual(['attack-input', 'name-only', 'status-only']);
    expect(themes[2].operations.run.requests.map((request: { id: string }) => request.id)).toEqual([
      'reset-demo', 'without-session', 'issue-token', 'without-token', 'valid-transfer', 'reuse-token'
    ]);
    expect(themes[2].operations.start.processes[0].url).toBe('http://127.0.0.1:4107/demo');
    expect(themes[3].operations.start.processes[0].url).toBe('http://127.0.0.1:4108/');
    expect(themes.map((theme) => themeSpecificResources(theme.resources).length)).toEqual([4, 3, 3, 4]);
    expect(themeSpecificResources(themes[2].resources).map((resource: { id: string }) => resource.id))
      .toContain('page-source');
  });

  it('security09からsecurity12に防御対象ごとの操作と関連ファイルを返す', async () => {
    const themeIds = ['security09', 'security10', 'security11', 'security12'];
    const responses = await injectActualThemes(themeIds);

    expect(responses.every((response) => response.statusCode === 200)).toBe(true);
    const themes = responses.map((response) => response.json().data.theme);
    expect(themes[0].operations.start.processes[0].url).toBe('http://127.0.0.1:4109/');
    expect(themes[1].operations.run.commandOperations.map((operation: { id: string }) => operation.id))
      .toEqual(['missing-settings', 'configured-settings']);
    expect(themes[2].operations.run.requests.map((request: { id: string }) => request.id)).toEqual([
      'valid-signature', 'tampered-body', 'expired-timestamp', 'missing-event-id', 'replay-event', 'body-too-large'
    ]);
    expect(themes[3].operations.run.commandOperations.map((operation: { id: string }) => operation.id))
      .toEqual(['all-events', 'success-event', 'denied-event']);
    expect(themes.map((theme) => themeSpecificResources(theme.resources).length)).toEqual([4, 3, 5, 3]);
    expect(themes.map((theme) => themeSpecificResources(theme.resources)
      .map((resource: { id: string }) => resource.id))).toEqual(expect.arrayContaining([
      expect.arrayContaining(['upload-policy']),
      expect.arrayContaining(['secret-rotation']),
      expect.arrayContaining(['replay-protection']),
      expect.arrayContaining(['audit-events'])
    ]));
  });

  it('security13からsecurity16に比較対象ごとの操作と関連ファイルを返す', async () => {
    const themeIds = ['security13', 'security14', 'security15', 'security16'];
    const responses = await injectActualThemes(themeIds);

    expect(responses.every((response) => response.statusCode === 200)).toBe(true);
    const themes = responses.map((response) => response.json().data.theme);
    expect(themes[0].operations.run.requests.map((request: { id: string }) => request.id)).toEqual([
      'burst-limit', 'reset-window', 'key-isolation', 'single-request'
    ]);
    expect(themes[1].operations.run.requests.map((request: { id: string }) => request.id)).toEqual([
      'allowed-preflight', 'denied-origin', 'denied-method', 'denied-header', 'allowed-get'
    ]);
    expect(themes[2].operations.run.requests.map((request: { id: string }) => request.id)).toEqual([
      'protected-response', 'unprotected-response'
    ]);
    expect(themes[3].operations.run.commandOperations.map((operation: { id: string }) => operation.id)).toEqual([
      'full-plan', 'severity-summary', 'sorted-actions', 'invalid-report'
    ]);
    expect(themes.map((theme) => themeSpecificResources(theme.resources).length)).toEqual([3, 2, 2, 3]);
  });

  it('security17からsecurity20に入力境界とデータ保護の画面・操作・関連ファイルを返す', async () => {
    const themeIds = ['security17', 'security18', 'security19', 'security20'];
    const responses = await injectActualThemes(themeIds);

    expect(responses.every((response) => response.statusCode === 200)).toBe(true);
    const themes = responses.map((response) => response.json().data.theme);
    expect(themes[0].operations.start.processes[0].url).toBe('http://127.0.0.1:4117/');
    expect(themes[1].operations.start.processes[0].url).toBe('http://127.0.0.1:4118/');
    expect(themes[2].operations.run.commandOperations.map((operation: { id: string }) => operation.id)).toEqual([
      'retention-results', 'reason-summary', 'deletion-candidates', 'invalid-and-future-dates'
    ]);
    expect(themes[3].operations.run.commandOperations.map((operation: { id: string }) => operation.id)).toEqual([
      'mask-all', 'unchanged-text', 'masking-cases'
    ]);
    expect(themes.map((theme) => themeSpecificResources(theme.resources).length)).toEqual([3, 3, 3, 3]);
    expect(themeSpecificResources(themes[0].resources).map((resource: { id: string }) => resource.id))
      .toEqual(expect.arrayContaining(['guardrail-policy']));
    expect(themeSpecificResources(themes[1].resources).map((resource: { id: string }) => resource.id))
      .toEqual(expect.arrayContaining(['trust-boundary']));
  });

  it('security21に判定・監査・人による確認対象の操作と関連ファイルを返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/security21?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    const theme = response.json().data.theme;
    expect(theme.operations.run.commandOperations.map((operation: { id: string }) => operation.id)).toEqual([
      'moderation-decisions', 'audit-records', 'review-queue'
    ]);
    expect(theme.resources.filter((resource: { id: string }) => !formalDocumentResourceIds.has(resource.id)).map((resource: { id: string }) => resource.id)).toEqual([
      'moderation-source', 'policy-source', 'content-taxonomy', 'case-table', 'audit-source',
      'audit-schema', 'safe-responses', 'escalation-notes'
    ]);
  });

  it('aws01とaws02に権限判定・通信経路の操作と関連ファイルを返す', async () => {
    const responses = await injectActualThemes(['aws01', 'aws02']);

    expect(responses.every((response) => response.statusCode === 200)).toBe(true);
    const themes = responses.map((response) => response.json().data.theme);
    expect(themes[0].operations.run.commandOperations.map((operation: { id: string }) => operation.id)).toEqual([
      'allowed-actions', 'implicit-deny', 'explicit-deny', 'admin-risk'
    ]);
    expect(themes[1].operations.run.commandOperations.map((operation: { id: string }) => operation.id)).toEqual([
      'public-web', 'internal-api', 'internal-database', 'private-api-host-port', 'private-database-host-port'
    ]);
    expect(themes[1].operations.run.commandOperations
      .find((operation: { id: string }) => operation.id === 'private-database-host-port')
      .processes.map((process: { id: string }) => process.id)).toEqual([
      'database-publishers', 'private-database-host-port'
    ]);
    expect(themes.map((theme) => themeSpecificResources(theme.resources).length)).toEqual([7, 7]);
  });

  it('aws03とaws04にサーバー状態・接続設定の操作と関連ファイルを返す', async () => {
    const responses = await injectActualThemes(['aws03', 'aws04']);

    expect(responses.every((response) => response.statusCode === 200)).toBe(true);
    const themes = responses.map((response) => response.json().data.theme);
    expect(themes[0].operations.run.commandOperations.map((operation: { id: string }) => operation.id)).toEqual([
      'health-response', 'container-logs', 'published-port', 'container-diagnostics', 'stop-failure-recovery'
    ]);
    expect(themes[1].operations.run.commandOperations.map((operation: { id: string }) => operation.id)).toEqual([
      'successful-connection', 'authentication-failure', 'network-failure'
    ]);
    expect(themes.map((theme) => themeSpecificResources(theme.resources).length)).toEqual([6, 6]);
  });

  it('aws05とaws06にobject保存・構造化ログの操作と関連ファイルを返す', async () => {
    const responses = await injectActualThemes(['aws05', 'aws06']);

    expect(responses.every((response) => response.statusCode === 200)).toBe(true);
    const themes = responses.map((response) => response.json().data.theme);
    expect(themes[0].operations.run.commandOperations.map((operation: { id: string }) => operation.id)).toEqual([
      'save-read', 'list-objects', 'delete-object', 'metadata-access', 'reject-unsafe-key'
    ]);
    expect(themes[1].operations.run.requests.map((request: { id: string }) => request.id)).toEqual([
      'normal-request', 'error-request', 'sensitive-request'
    ]);
    expect(themes.map((theme) => themeSpecificResources(theme.resources).length)).toEqual([4, 3]);
  });

  it('aws07とaws08にLambdaの正常・異常操作と関連ファイルを返す', async () => {
    const responses = await injectActualThemes(['aws07', 'aws08']);

    expect(responses.every((response) => response.statusCode === 200)).toBe(true);
    const themes = responses.map((response) => response.json().data.theme);
    expect(themes[0].operations.run.commandOperations.map((operation: { id: string }) => operation.id)).toEqual([
      'valid-event', 'missing-name', 'runtime-settings'
    ]);
    expect(themes[1].operations.run.requests.map((request: { id: string }) => request.id)).toEqual([
      'list-items', 'get-item', 'create-item', 'missing-name', 'invalid-json', 'missing-route'
    ]);
    expect(themes[1].operations.run.requests.find((request: { id: string }) => request.id === 'invalid-json').body).toBe('{');
    expect(themes.map((theme) => themeSpecificResources(theme.resources).length)).toEqual([5, 5]);
  });

  it('aws09とaws10に障害復旧とバックアップ復元の個別操作を返す', async () => {
    const responses = await injectActualThemes(['aws09', 'aws10']);

    expect(responses.every((response) => response.statusCode === 200)).toBe(true);
    const themes = responses.map((response) => response.json().data.theme);
    expect(themes[0].operations.run.requests.map((request: { id: string }) => request.id)).toEqual([
      'health', 'service', 'config', 'missing-config', 'simulate-failure', 'failed-health', 'recover'
    ]);
    expect(themes[0].operations.start).toMatchObject({
      processes: [
        { id: 'image-build', command: 'docker', args: ['build', '-t', 'studyhub-aws09', '.'] },
        { id: 'application', command: 'docker', healthUrl: 'http://127.0.0.1:43509/health' }
      ]
    });
    expect(themes[1].operations.run.commandOperations.map((operation: { id: string }) => operation.id)).toEqual([
      'backup', 'restore-dry-run', 'restore', 'missing-backup'
    ]);
    expect(themes.map((theme) => themeSpecificResources(theme.resources).length)).toEqual([5, 6]);
  });

  it('不正なカタログ指定を拒否する', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/fields?catalog=unknown'
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('CATALOG_INVALID');
  });

  it('devops01からdevops10に個別操作と関連ソースを返す', async () => {
    const responses = await injectActualThemes(
      [
        'devops01', 'devops02', 'devops03', 'devops04', 'devops05',
        'devops06', 'devops07', 'devops08', 'devops09', 'devops10'
      ]
    );

    expect(responses.every((response) => response.statusCode === 200)).toBe(true);
    const themes = responses.map((response) => response.json().data.theme);

    expect(themes[0].operations.run.commandOperations).toMatchObject([
      { id: 'build-check', label: 'ローカルでビルドを確認' }
    ]);
    expect(themes[1].operations.run.commandOperations.map((operation: { id: string }) => operation.id))
      .toEqual(['lint', 'unit-test', 'quality-check']);
    expect(themes[5].operations.run.requests).toHaveLength(4);
    expect(themes[6].operations.run.requests).toHaveLength(5);
    expect(themes[7].operations.run.commandOperations).toHaveLength(6);

    expect(themes.map((theme) => themeSpecificResources(theme.resources).length))
      .toEqual([5, 7, 4, 6, 5, 5, 5, 10, 9, 7]);
    expect(themes[7].resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'investigation-template', format: 'markdown' }),
      expect.objectContaining({ id: 'port-conflict-guide', format: 'markdown' })
    ]));
    expect(themes[8].resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'workflow-source', label: 'CI workflow' })
    ]));
    expect(themes[9].resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'workflow-source', label: 'CI workflow' })
    ]));
  });
});

describe('テーマ操作API', () => {
  it('文字列以外の入力を拒否する', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/themes/sample-command/run',
      payload: { input: { value: 'not-string' } }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('INVALID_INPUT');
  });

  it('未起動のAPIテーマを実行しない', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/themes/sample-request-process/run',
      payload: { input: 'sample' }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: 'RUN_FAILED',
        message: '先に実行環境を起動してください。'
      }
    });
  });

  it('手動確認テーマを環境なしとして返す', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/themes/sample-manual/recheck'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.runtime.state).toBe('unavailable');
  });

  it('システム構成と設計レビューの画面に整理用資料を返す', async () => {
    const arch01Response = await app.inject({
      method: 'GET',
      url: '/api/themes/arch01?catalog=actual'
    });
    const arch02Response = await app.inject({
      method: 'GET',
      url: '/api/themes/arch02?catalog=actual'
    });

    expect(arch01Response.statusCode).toBe(200);
    expect(arch01Response.json().data.theme.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'server-source', label: 'API・SQLite・ログ処理' }),
      expect.objectContaining({ id: 'components', label: '構成要素の整理' }),
      expect.objectContaining({ id: 'decision-notes', label: '構成判断メモ' })
    ]));
    expect(arch02Response.statusCode).toBe(200);
    expect(arch02Response.json().data.theme.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'server-source', label: 'レビュー対象API・SQLite処理' }),
      expect.objectContaining({ id: 'review-target', label: 'レビュー対象と範囲' }),
      expect.objectContaining({ id: 'curl-evidence', label: 'curlによるAPI証拠' }),
      expect.objectContaining({ id: 'evidence-mapping', label: '主張と証拠の対応' }),
      expect.objectContaining({ id: 'review-result-template', label: 'レビュー結果のひな形' })
    ]));
  });

  it('Electronテーマに許可済みのGUI起動定義だけを返す', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/themes/desktop01?catalog=actual'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.theme.operations).toMatchObject({
      start: {
        processes: [{ command: 'electron', args: ['--disable-gpu-sandbox', '.'] }]
      },
      stop: { mode: 'managed' }
    });
    expect(response.json().data.theme.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'ipc-flow', label: '画面とメイン処理の連携' }),
      expect.objectContaining({ id: 'cleanup-source', label: '後片付けのソース' }),
      expect.objectContaining({ id: 'safety-tests', label: '安全性テストのソース' })
    ]));
  });

  it('単独アプリ4件に個別操作と実ソースを返す', async () => {
    const ideaForgeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/study-idea-forge?catalog=actual'
    });
    const ideaGenerationResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/study-ai-idea-generation?catalog=actual'
    });
    const corporateEmployeeResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/study-ai-corporate-employee?catalog=actual'
    });
    const studyApiResponse = await app.inject({
      method: 'GET',
      url: '/api/themes/study-api?catalog=actual'
    });

    expect(ideaForgeResponse.statusCode).toBe(200);
    expect(ideaForgeResponse.json().data.theme.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'backend-api', kind: 'source' }),
      expect.objectContaining({ id: 'database-tests', kind: 'source' })
    ]));
    expect(ideaGenerationResponse.statusCode).toBe(200);
    expect(ideaGenerationResponse.json().data.theme.operations.run.commandOperations).toHaveLength(7);
    expect(ideaGenerationResponse.json().data.theme.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'mindmap-prompt', format: 'markdown' }),
      expect.objectContaining({ id: 'verification-source', format: 'source' })
    ]));
    expect(corporateEmployeeResponse.statusCode).toBe(200);
    expect(corporateEmployeeResponse.json().data.theme.operations.run.commandOperations).toHaveLength(2);
    expect(corporateEmployeeResponse.json().data.theme.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'hr-permissions', format: 'text' }),
      expect.objectContaining({ id: 'evaluation-template', format: 'markdown' })
    ]));
    expect(studyApiResponse.statusCode).toBe(200);
    expect(studyApiResponse.json().data.theme.operations.run.requests).toHaveLength(12);
    expect(studyApiResponse.json().data.theme.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'api-source', label: 'Web APIのソース' }),
      expect.objectContaining({ id: 'api-tests', label: '正常系と異常系のテスト' })
    ]));
  });
});
