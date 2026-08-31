import net from 'node:net';
import fs from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import type { Field, Theme } from '../../shared/catalog.js';
import { loadCatalog, repositoryRoot, sampleDataRoot } from '../catalog/loader.js';
import { RuntimeManager, shouldHideProcessWindow, stripAnsiControlSequences } from './manager.js';

const managers: RuntimeManager[] = [];
const runtimeStartupTimeoutSeconds = 30;
const networkTestTimeoutMilliseconds = 45000;

describe('実行ログ', () => {
  it('ANSI制御コードを除去する', () => {
    expect(stripAnsiControlSequences('\u001b[32m\u001b[1mVITE\u001b[22m v8.0.10\u001b[39m')).toBe('VITE v8.0.10');
  });
});

describe('外部GUIの起動', () => {
  it('Electronだけはウィンドウを表示する', () => {
    expect(shouldHideProcessWindow('electron')).toBe(false);
    expect(shouldHideProcessWindow('node')).toBe(true);
  });
});

afterEach(async () => {
  for (const manager of managers.splice(0)) {
    await manager.stopAll();
  }
});

async function findFreePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('テスト用ポートを取得できません。'));
        return;
      }
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function expectRuntimeReady(manager: RuntimeManager, theme: Theme): Promise<void> {
  const runtime = await manager.start(theme);
  const diagnostics = manager.entries(theme.id)
    .map((entry) => `[${entry.source}] ${entry.message}`)
    .join('\n');
  expect(runtime.state, diagnostics || runtime.message).toBe('ready');
}

function sharedTheme(id: string, runtimeId: string, port: number, path = '/'): Theme {
  return {
    id,
    fieldId: 'sample-ai',
    name: id,
    summary: '共有実行環境のテスト',
    presentation: 'web',
    integrationMode: 'embedded',
    lifecycle: 'shared',
    material: {
      path: 'materials/runtime/web-server.mjs',
      openMode: 'embedded'
    },
    environment: {
      required: ['node']
    },
    operations: {
      start: {
        runtimeId,
        processes: [
          {
            id: 'shared-web',
            command: 'node',
            args: [
              'materials/runtime/web-server.mjs',
              '--port',
              String(port),
              '--title',
              '共有実行環境のテスト'
            ],
            url: `http://127.0.0.1:${port}${path}`,
            healthUrl: `http://127.0.0.1:${port}/health`
          }
        ]
      },
      stop: {
        mode: 'release'
      }
    },
    timeoutSeconds: runtimeStartupTimeoutSeconds
  };
}

function requestStackTheme(apiPort: number, dependencyPort: number): Theme {
  return {
    id: 'sample-request-stack-test',
    fieldId: 'sample-web',
    name: '依存環境付きAPIのテスト',
    summary: '複数処理の起動とリクエストを確認します。',
    presentation: 'request',
    integrationMode: 'request',
    lifecycle: 'stack',
    material: {
      path: 'materials/runtime/api-server.mjs',
      openMode: 'none'
    },
    environment: {
      required: ['node']
    },
    operations: {
      start: {
        runtimeId: 'sample-request-stack-test',
        processes: [
          {
            id: 'dependency',
            command: 'node',
            args: [
              'materials/runtime/dependency-server.mjs',
              '--port',
              String(dependencyPort)
            ],
            healthUrl: `http://127.0.0.1:${dependencyPort}/health`
          },
          {
            id: 'api',
            command: 'node',
            args: [
              'materials/runtime/api-server.mjs',
              '--port',
              String(apiPort),
              '--dependency-url',
              `http://127.0.0.1:${dependencyPort}/value`
            ],
            healthUrl: `http://127.0.0.1:${apiPort}/health`
          }
        ]
      },
      run: {
        mode: 'request',
        method: 'POST',
        url: `http://127.0.0.1:${apiPort}/run`
      },
      stop: {
        mode: 'managed'
      }
    },
    timeoutSeconds: runtimeStartupTimeoutSeconds
  };
}

function textRequestTheme(port: number): Theme {
  return {
    id: 'sample-text-request-test',
    fieldId: 'sample-web',
    name: 'テキスト応答のテスト',
    summary: 'GETリクエストのテキスト応答を確認します。',
    presentation: 'request',
    integrationMode: 'request',
    lifecycle: 'process',
    material: {
      path: 'materials/runtime/web-server.mjs',
      openMode: 'none'
    },
    environment: {
      required: ['node']
    },
    operations: {
      start: {
        runtimeId: 'sample-text-request-test',
        processes: [
          {
            id: 'web',
            command: 'node',
            args: ['materials/runtime/web-server.mjs', '--port', String(port)],
            healthUrl: `http://127.0.0.1:${port}/health`
          }
        ]
      },
      run: {
        mode: 'request',
        method: 'GET',
        url: `http://127.0.0.1:${port}/`,
        request: {}
      },
      stop: {
        mode: 'managed'
      }
    },
    timeoutSeconds: runtimeStartupTimeoutSeconds
  };
}

function requestFeaturesTheme(port: number): Theme {
  const url = `http://127.0.0.1:${port}`;
  return {
    id: 'sample-request-features-test',
    fieldId: 'sample-web',
    name: 'API通信機能のテスト',
    summary: '応答ヘッダー、Cookie、タイムアウトを確認します。',
    presentation: 'request',
    integrationMode: 'request',
    lifecycle: 'process',
    material: {
      path: 'materials/runtime/request-features-server.mjs',
      openMode: 'none'
    },
    environment: {
      required: ['node']
    },
    operations: {
      start: {
        runtimeId: 'sample-request-features-test',
        processes: [{
          id: 'api',
          command: 'node',
          args: ['materials/runtime/request-features-server.mjs', '--port', String(port)],
          healthUrl: `${url}/health`
        }]
      },
      run: {
        mode: 'request',
        requests: [
          { id: 'login', label: 'ログイン', method: 'POST', url: `${url}/login` },
          { id: 'me', label: '状態確認', method: 'GET', url: `${url}/me` },
          { id: 'logout', label: 'ログアウト', method: 'POST', url: `${url}/logout` },
          {
            id: 'slow',
            label: '遅い応答',
            method: 'GET',
            url: `${url}/slow`,
            timeoutMilliseconds: 20
          },
          {
            id: 'retry',
            label: '一時エラーを再試行',
            method: 'GET',
            url: `${url}/temporary`,
            retry: {
              maxAttempts: 3,
              delayMilliseconds: 1,
              statusCodes: [503]
            }
          }
        ]
      },
      stop: {
        mode: 'managed'
      }
    },
    timeoutSeconds: runtimeStartupTimeoutSeconds
  };
}

function taskStackTheme(): Theme {
  const task = (id: string) => ({
    id,
    command: 'node',
    args: ['materials/runtime/command.mjs'],
    execution: 'task' as const,
    url: 'http://127.0.0.1:49999/'
  });
  return {
    id: 'sample-task-stack-test',
    fieldId: 'sample-devops',
    name: '完了待ち処理のテスト',
    summary: '起動処理と後片付け処理を順番に実行します。',
    presentation: 'command',
    integrationMode: 'command',
    lifecycle: 'stack',
    material: {
      path: 'materials/runtime/command.mjs',
      openMode: 'none'
    },
    environment: {
      required: ['node']
    },
    operations: {
      start: {
        runtimeId: 'sample-task-stack-test',
        processes: [task('setup')],
        cleanup: [
          {
            id: 'cleanup',
            command: 'node',
            args: ['materials/runtime/allowed-failure.mjs'],
            execution: 'task',
            allowFailure: true
          }
        ]
      },
      stop: {
        mode: 'managed'
      }
    },
    timeoutSeconds: 10
  };
}

function commandSequenceTheme(): Theme {
  return {
    id: 'sample-command-sequence-test',
    fieldId: 'sample-base',
    name: '連続コマンドのテスト',
    summary: '複数コマンドとnpmを順番に実行します。',
    presentation: 'command',
    integrationMode: 'command',
    lifecycle: 'one-shot',
    material: {
      path: 'materials/runtime/command.mjs',
      openMode: 'none'
    },
    environment: {
      required: ['node']
    },
    operations: {
      run: {
        mode: 'command',
        processes: [
          {
            id: 'node-command',
            command: 'node',
            args: ['materials/runtime/command.mjs']
          },
          {
            id: 'npm-command',
            command: 'npm',
            args: ['--version']
          },
          {
            id: 'stdin-command',
            command: 'node',
            args: ['materials/runtime/stdin-reader.mjs'],
            stdinFile: 'materials/runtime/stdin-input.txt'
          }
        ]
      }
    },
    timeoutSeconds: 10
  };
}

function temporaryDirectoryTheme(): Theme {
  const processDefinition = (id: string, action: string) => ({
    id,
    command: 'node',
    args: ['materials/runtime/temporary-directory.mjs', action],
    temporaryDirectoryEnv: 'STUDYHUB_TEST_TEMP_ROOT'
  });
  return {
    id: 'sample-temporary-directory-test',
    fieldId: 'sample-aws',
    name: '一時フォルダのテスト',
    summary: '連続コマンドで一時フォルダを共有し、実行後に削除します。',
    presentation: 'command',
    integrationMode: 'command',
    lifecycle: 'one-shot',
    material: {
      path: 'materials/runtime/temporary-directory.mjs',
      openMode: 'none'
    },
    environment: {
      required: ['node']
    },
    operations: {
      run: {
        mode: 'command',
        processes: [
          processDefinition('write-marker', 'write'),
          processDefinition('check-marker', 'check')
        ]
      }
    },
    timeoutSeconds: 10
  };
}

describe('共有実行環境', () => {
  it('利用中のテーマだけを解除し、最後のテーマで実行環境を停止する', async () => {
    const port = await findFreePort();
    const manager = new RuntimeManager(sampleDataRoot);
    managers.push(manager);
    const first = sharedTheme('sample-shared-first', 'sample-shared-test', port);
    const second = sharedTheme('sample-shared-second', 'sample-shared-test', port, '/system02');

    expect((await manager.start(first)).processes[0]?.url).toBe(`http://127.0.0.1:${port}/`);
    const secondStarted = await manager.start(second);
    expect(secondStarted.consumers).toEqual([
      'sample-shared-first',
      'sample-shared-second'
    ]);
    expect(secondStarted.processes[0]?.url).toBe(`http://127.0.0.1:${port}/system02`);

    const released = await manager.stop(first);
    expect(released.state).toBe('stopped');
    expect(released.consumers).toEqual(['sample-shared-second']);
    expect(manager.status(second)).toMatchObject({
      state: 'ready',
      processes: [{ url: `http://127.0.0.1:${port}/system02` }]
    });

    expect((await manager.stop(second)).state).toBe('stopped');
  }, networkTestTimeoutMilliseconds);
});

describe('テーマの実行制御', () => {
  it('起動中に受け付けた停止を起動完了後に順番どおり実行する', async () => {
    const manager = new RuntimeManager(sampleDataRoot);
    managers.push(manager);
    const port = await findFreePort();
    const theme = textRequestTheme(port);

    const startResult = manager.start(theme);
    const stopResult = manager.stop(theme);

    expect((await startResult).state).toBe('ready');
    expect((await stopResult).state).toBe('stopped');
    expect(manager.status(theme).state).toBe('stopped');
  }, networkTestTimeoutMilliseconds);

  it('分野に登録された検証コマンドをリポジトリ直下から実行する', async () => {
    const manager = new RuntimeManager(sampleDataRoot, repositoryRoot);
    managers.push(manager);
    const field: Field = {
      id: 'field-check-test',
      name: '分野検証テスト',
      summary: '分野検証のテストです。',
      order: 1,
      check: {
        command: 'node',
        args: ['sample-data/materials/runtime/command.mjs'],
        timeoutSeconds: 10
      }
    };

    const report = await manager.checkField(field);

    expect(report.result).toMatchObject({ ok: true, exitCode: 0 });
    expect(report.logs).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'validator', level: 'info' })
    ]));
  });

  it('分野で必要なNode.jsと実行入口の準備状態を返す', async () => {
    const manager = new RuntimeManager(sampleDataRoot, repositoryRoot);
    managers.push(manager);
    const field: Field = {
      id: 'readiness-test',
      name: '準備状態テスト',
      summary: '準備状態のテストです。',
      order: 1
    };
    const theme = sharedTheme('readiness-theme', 'readiness-runtime', 3000);
    theme.environment.required = ['Node.js'];

    const report = await manager.inspectFieldReadiness(field, [theme]);

    expect(report.ready).toBe(true);
    expect(report.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'node', status: 'ready' }),
      expect.objectContaining({ id: 'theme-entry', status: 'ready' })
    ]));
  });

  it('不足しているテーマ実行入口を要準備として返す', async () => {
    const manager = new RuntimeManager(sampleDataRoot, repositoryRoot);
    managers.push(manager);
    const field: Field = {
      id: 'missing-entry-test',
      name: '不足状態テスト',
      summary: '不足状態のテストです。',
      order: 1
    };
    const theme = sharedTheme('missing-entry-theme', 'missing-entry-runtime', 3000);
    theme.environment.required = ['Node.js', 'テーマの依存パッケージ'];
    theme.operations.start!.processes[0]!.args = ['node_modules/missing/bin.js'];

    const report = await manager.inspectFieldReadiness(field, [theme]);

    expect(report.ready).toBe(false);
    expect(report.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'theme-entry', status: 'missing' })
    ]));
  });

  it('コマンドを1回実行して結果を返す', async () => {
    const manager = new RuntimeManager(sampleDataRoot);
    managers.push(manager);
    const theme = loadCatalog().themeById.get('sample-command');
    expect(theme).toBeDefined();

    const result = await manager.run(theme!, 'sample-input');

    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.output).toMatchObject({
      received: { input: 'sample-input' }
    });
  });

  it('依存処理とAPIを起動してリクエスト後に停止する', async () => {
    const dependencyPort = await findFreePort();
    let apiPort = await findFreePort();
    while (apiPort === dependencyPort) apiPort = await findFreePort();
    const manager = new RuntimeManager(sampleDataRoot);
    managers.push(manager);
    const theme = requestStackTheme(apiPort, dependencyPort);

    await expectRuntimeReady(manager, theme);
    const result = await manager.run(theme, 'request-input');
    expect(result.ok).toBe(true);
    expect(result.output).toMatchObject({
      received: { input: 'request-input' },
      dependency: { value: '疑似依存サービスの応答' }
    });
    expect((await manager.stop(theme)).state).toBe('stopped');
  }, networkTestTimeoutMilliseconds);

  it('404を返す起動確認URLを準備完了として扱わない', async () => {
    const port = await findFreePort();
    const manager = new RuntimeManager(sampleDataRoot);
    managers.push(manager);
    const theme = requestFeaturesTheme(port);
    theme.timeoutSeconds = 1;
    theme.operations.start!.processes[0]!.healthUrl = `http://127.0.0.1:${port}/missing`;

    const runtime = await manager.start(theme);

    expect(runtime.state).toBe('failed');
    expect(runtime.message).toContain('起動確認が制限時間を超えました');
  }, networkTestTimeoutMilliseconds);

  it('状態の再確認で実際のヘルスチェック失敗を返す', async () => {
    const port = await findFreePort();
    const manager = new RuntimeManager(sampleDataRoot);
    managers.push(manager);
    const theme = requestFeaturesTheme(port);

    await expectRuntimeReady(manager, theme);
    theme.operations.start!.processes[0]!.healthUrl = `http://127.0.0.1:${port}/missing`;
    const runtime = await manager.recheck(theme);

    expect(runtime.state).toBe('failed');
    expect(runtime.message).toContain('HTTP 404');
  }, networkTestTimeoutMilliseconds);

  it('複数処理を停止した直後に同じポートで再起動できる', async () => {
    const dependencyPort = await findFreePort();
    let apiPort = await findFreePort();
    while (apiPort === dependencyPort) apiPort = await findFreePort();
    const manager = new RuntimeManager(sampleDataRoot);
    managers.push(manager);
    const theme = requestStackTheme(apiPort, dependencyPort);

    await expectRuntimeReady(manager, theme);
    expect((await manager.stop(theme)).state).toBe('stopped');
    await expectRuntimeReady(manager, theme);
  }, networkTestTimeoutMilliseconds);

  it('複数のAPI操作から選択し、定義された入力を送る', async () => {
    const dependencyPort = await findFreePort();
    let apiPort = await findFreePort();
    while (apiPort === dependencyPort) apiPort = await findFreePort();
    const manager = new RuntimeManager(sampleDataRoot);
    managers.push(manager);
    const theme = requestStackTheme(apiPort, dependencyPort);
    theme.operations.run = {
      mode: 'request',
      requests: [
        {
          id: 'health',
          label: '稼働確認',
          method: 'GET',
          url: `http://127.0.0.1:${apiPort}/health`
        },
        {
          id: 'run',
          label: 'API実行',
          method: 'POST',
          url: `http://127.0.0.1:${apiPort}/run`,
          inputs: [{ name: 'input', label: '入力値', target: 'body', required: true }]
        }
      ]
    };

    await expectRuntimeReady(manager, theme);
    const result = await manager.run(theme, '', 'run', { input: 'multiple-request' });
    expect(result.ok).toBe(true);
    expect(result.output).toMatchObject({ received: { input: 'multiple-request' } });
  }, networkTestTimeoutMilliseconds);

  it('GETリクエストのHTML応答を文字列として返す', async () => {
    const port = await findFreePort();
    const manager = new RuntimeManager(sampleDataRoot);
    managers.push(manager);
    const theme = textRequestTheme(port);

    await expectRuntimeReady(manager, theme);
    const result = await manager.run(theme, 'unused');
    expect(result.ok).toBe(true);
    expect(result.output).toContain('<!doctype html>');
  }, networkTestTimeoutMilliseconds);

  it('応答ヘッダーを返し、Cookieを次のAPI操作へ引き継いで削除する', async () => {
    const port = await findFreePort();
    const manager = new RuntimeManager(sampleDataRoot);
    managers.push(manager);
    const theme = requestFeaturesTheme(port);

    await expectRuntimeReady(manager, theme);
    const login = await manager.run(theme, '', 'login');
    expect(login.headers?.['set-cookie']).toEqual(expect.arrayContaining([
      expect.stringContaining('sid=studyhub-session')
    ]));
    expect(await manager.run(theme, '', 'me')).toMatchObject({
      ok: true,
      statusCode: 200,
      output: { user: 'studyhub' }
    });
    await manager.run(theme, '', 'logout');
    expect(await manager.run(theme, '', 'me')).toMatchObject({
      ok: false,
      statusCode: 401
    });
  }, networkTestTimeoutMilliseconds);

  it('ある接続先で受け取ったCookieを別オリジンへ送らない', async () => {
    const firstPort = await findFreePort();
    let secondPort = await findFreePort();
    while (secondPort === firstPort) secondPort = await findFreePort();
    const manager = new RuntimeManager(sampleDataRoot);
    managers.push(manager);
    const theme = requestFeaturesTheme(firstPort);
    theme.operations.start!.processes.push({
      id: 'other-api',
      command: 'node',
      args: ['materials/runtime/request-features-server.mjs', '--port', String(secondPort)],
      healthUrl: `http://127.0.0.1:${secondPort}/health`
    });
    theme.operations.run!.requests!.push({
      id: 'other-me',
      label: '別オリジンの状態確認',
      method: 'GET',
      url: `http://127.0.0.1:${secondPort}/me`
    });

    await expectRuntimeReady(manager, theme);
    expect((await manager.run(theme, '', 'login')).ok).toBe(true);
    expect(await manager.run(theme, '', 'other-me')).toMatchObject({
      ok: false,
      statusCode: 401
    });
  }, networkTestTimeoutMilliseconds);

  it('API操作ごとの制限時間で遅い応答を打ち切る', async () => {
    const port = await findFreePort();
    const manager = new RuntimeManager(sampleDataRoot);
    managers.push(manager);
    const theme = requestFeaturesTheme(port);

    await expectRuntimeReady(manager, theme);
    expect(await manager.run(theme, '', 'slow')).toMatchObject({
      ok: false,
      output: { error: 'request_timeout', timeoutMilliseconds: 20 }
    });
  }, networkTestTimeoutMilliseconds);

  it('指定した一時エラーだけを上限回数まで再試行し、試行履歴を返す', async () => {
    const port = await findFreePort();
    const manager = new RuntimeManager(sampleDataRoot);
    managers.push(manager);
    const theme = requestFeaturesTheme(port);

    await expectRuntimeReady(manager, theme);
    expect(await manager.run(theme, '', 'retry')).toMatchObject({
      ok: true,
      statusCode: 200,
      output: {
        attempts: [
          { attempt: 1, ok: false, statusCode: 503 },
          { attempt: 2, ok: false, statusCode: 503 },
          { attempt: 3, ok: true, statusCode: 200 }
        ],
        final: { attempt: 3, recovered: true }
      }
    });
  }, networkTestTimeoutMilliseconds);

  it('完了待ちの起動処理と後片付け処理を順番に実行する', async () => {
    const manager = new RuntimeManager(sampleDataRoot);
    managers.push(manager);
    const theme = taskStackTheme();

    const started = await manager.start(theme);
    expect(started.state).toBe('ready');
    expect(started.processes).toEqual([
      { id: 'setup', url: 'http://127.0.0.1:49999/' }
    ]);
    expect(manager.entries(theme.id).some((entry) => entry.source === 'setup')).toBe(true);
    expect((await manager.stop(theme)).state).toBe('stopped');
    expect(manager.entries(theme.id).some((entry) => entry.source === 'cleanup')).toBe(true);
  });

  it('Node.jsとnpmのコマンドを順番に実行する', async () => {
    const manager = new RuntimeManager(sampleDataRoot);
    managers.push(manager);

    const result = await manager.run(commandSequenceTheme(), 'sequence-input');

    expect(result.ok).toBe(true);
    expect(result.output).toMatchObject([
      {
        id: 'node-command',
        ok: true,
        output: { received: { input: 'sequence-input' } }
      },
      {
        id: 'npm-command',
        ok: true
      },
      {
        id: 'stdin-command',
        ok: true,
        output: { input: '標準入力ファイルの内容' }
      }
    ]);
  });

  it('複数のコマンド操作から選択した処理だけを実行する', async () => {
    const manager = new RuntimeManager(sampleDataRoot);
    managers.push(manager);
    const theme = commandSequenceTheme();
    theme.operations.run = {
      mode: 'command',
      commandOperations: [
        {
          id: 'first',
          label: '最初の操作',
          processes: [{
            id: 'first-command',
            command: 'node',
            args: ['materials/runtime/command.mjs']
          }]
        },
        {
          id: 'second',
          label: '次の操作',
          processes: [{
            id: 'second-command',
            command: 'node',
            args: ['materials/runtime/command.mjs']
          }]
        }
      ]
    };

    const result = await manager.run(theme, 'selected-input', 'second');

    expect(result.ok).toBe(true);
    expect(result.output).toMatchObject([{
      id: 'second-command',
      output: { received: { input: 'selected-input' } }
    }]);
  });

  it('連続コマンドで一時フォルダを共有し、実行後に削除する', async () => {
    const manager = new RuntimeManager(sampleDataRoot);
    managers.push(manager);

    const result = await manager.run(temporaryDirectoryTheme(), 'unused');
    const outputs = result.output as Array<{ output: { root: string; markerExists?: boolean } }>;

    expect(result.ok).toBe(true);
    expect(outputs[1]?.output.markerExists).toBe(true);
    expect(fs.existsSync(outputs[1]!.output.root)).toBe(false);
  });
});
