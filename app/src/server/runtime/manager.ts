import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {
  Field,
  FieldCheckReport,
  FieldReadinessItem,
  FieldReadinessReport,
  LogEntry,
  ProcessDefinition,
  RunResult,
  RuntimeState,
  RuntimeView,
  Theme
} from '../../shared/catalog.js';

interface RunningProcess {
  definition: ProcessDefinition;
  child: ChildProcessWithoutNullStreams;
}

interface RuntimeRecord {
  id: string;
  state: RuntimeState;
  message: string;
  processes: RunningProcess[];
  exposed: ProcessDefinition[];
  cleanup: ProcessDefinition[];
  timeoutSeconds: number;
  consumers: Set<string>;
}

interface ResolvedCommand {
  command: string;
  args: string[];
}

export function stripAnsiControlSequences(value: string): string {
  return value
    .replace(/\u001B\][^\u0007]*(?:\u0007|\u001B\\)/g, '')
    .replace(/(?:\u001B\[|\u009B)[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\u001B[@-_]/g, '');
}

export function shouldHideProcessWindow(command: ProcessDefinition['command']): boolean {
  return command !== 'electron';
}

export class RuntimeManager {
  private readonly runtimes = new Map<string, RuntimeRecord>();
  private readonly logs = new Map<string, LogEntry[]>();
  private readonly cookies = new Map<string, Map<string, string>>();
  private readonly events = new EventEmitter();
  private operationTail: Promise<void> = Promise.resolve();
  private sequence = 0;

  constructor(
    private readonly workingDirectory: string,
    private readonly repositoryDirectory: string = workingDirectory
  ) {}

  status(theme: Theme): RuntimeView {
    const runtimeId = theme.operations.start?.runtimeId ?? null;
    if (!runtimeId) {
      const state = theme.lifecycle === 'manual'
        ? 'unavailable'
        : theme.lifecycle === 'none'
          ? 'ready'
          : 'stopped';
      const message = theme.lifecycle === 'manual'
        ? '外部環境は手動で確認します。'
        : theme.lifecycle === 'none'
          ? '起動なしで利用できます。'
          : '起動操作は不要です。';
      return {
        themeId: theme.id,
        runtimeId: null,
        state,
        message,
        processes: [],
        consumers: []
      };
    }

    const record = this.runtimes.get(runtimeId);
    if (!record) {
      return {
        themeId: theme.id,
        runtimeId,
        state: 'stopped',
        message: '停止しています。',
        processes: [],
        consumers: []
      };
    }

    if (theme.lifecycle === 'shared' && !record.consumers.has(theme.id)) {
      return {
        themeId: theme.id,
        runtimeId,
        state: 'stopped',
        message: '共有実行環境は動作中ですが、このテーマでは利用していません。',
        processes: [],
        consumers: [...record.consumers]
      };
    }

    const configuredSharedProcesses = theme.lifecycle === 'shared'
      ? new Map<string, ProcessDefinition>(
          (theme.operations.start?.processes ?? [])
            .filter((definition) => definition.url)
            .map((definition): [string, ProcessDefinition] => [definition.id, definition])
        )
      : new Map<string, ProcessDefinition>();
    const runtimeProcesses = [
      ...record.processes.map(({ definition }) => definition),
      ...record.exposed
    ].map((definition) => configuredSharedProcesses.get(definition.id) ?? definition);

    return {
      themeId: theme.id,
      runtimeId,
      state: record.state,
      message: record.message,
      processes: runtimeProcesses.map((definition) => {
        const view: { id: string; url?: string } = { id: definition.id };
        if (definition.url) view.url = definition.url;
        return view;
      }),
      consumers: [...record.consumers]
    };
  }

  start(theme: Theme): Promise<RuntimeView> {
    return this.enqueueOperation(() => this.startSequential(theme));
  }

  private async startSequential(theme: Theme): Promise<RuntimeView> {
    const start = theme.operations.start;
    if (!start) return this.status(theme);

    const existing = this.runtimes.get(start.runtimeId);
    if (existing && (existing.state === 'ready' || existing.state === 'starting')) {
      existing.consumers.add(theme.id);
      existing.message = theme.lifecycle === 'shared' ? '共有実行環境を利用しています。' : existing.message;
      return this.status(theme);
    }
    if (existing) await this.stopRecord(existing);
    this.cookies.delete(theme.id);

    const record: RuntimeRecord = {
      id: start.runtimeId,
      state: 'starting',
      message: '起動しています。',
      processes: [],
      exposed: [],
      cleanup: start.cleanup ?? [],
      timeoutSeconds: theme.timeoutSeconds ?? 10,
      consumers: new Set([theme.id])
    };
    this.runtimes.set(record.id, record);
    this.appendLog(theme.id, 'StudyHub', 'info', '起動を開始しました。');

    try {
      for (const definition of start.processes) {
        if (definition.execution === 'task') {
          await this.runTask(definition, record, record.timeoutSeconds);
          if (definition.url) record.exposed.push(definition);
        } else {
          const child = this.spawnProcess(definition, record);
          record.processes.push({ definition, child });
          await this.waitUntilSpawned(child, record.timeoutSeconds);
        }
        if (definition.healthUrl) {
          await this.waitUntilReady(definition.healthUrl, record.timeoutSeconds);
        }
      }
      if (record.state === 'failed') throw new Error(record.message);
      record.state = 'ready';
      record.message = '利用できます。';
      this.appendForConsumers(record, 'StudyHub', 'info', '起動が完了しました。');
    } catch (error) {
      record.state = 'failed';
      record.message = error instanceof Error ? error.message : '起動に失敗しました。';
      this.appendForConsumers(record, 'StudyHub', 'error', record.message);
      await this.stopChildren(record);
      try {
        await this.runCleanup(record);
      } catch (cleanupError) {
        const cleanupMessage = cleanupError instanceof Error
          ? cleanupError.message
          : '後片付けに失敗しました。';
        this.appendForConsumers(record, 'StudyHub', 'error', cleanupMessage);
      }
      record.exposed = [];
    }
    return this.status(theme);
  }

  stop(theme: Theme): Promise<RuntimeView> {
    return this.enqueueOperation(() => this.stopSequential(theme));
  }

  private async stopSequential(theme: Theme): Promise<RuntimeView> {
    this.cookies.delete(theme.id);
    const runtimeId = theme.operations.start?.runtimeId;
    if (!runtimeId) return this.status(theme);
    const record = this.runtimes.get(runtimeId);
    if (!record) return this.status(theme);

    if (theme.lifecycle === 'shared') {
      record.consumers.delete(theme.id);
      if (record.consumers.size > 0) {
        record.message = '他のテーマが共有実行環境を利用しています。';
        return this.status(theme);
      }
    }

    await this.stopRecord(record);
    if (record.state === 'stopped') {
      this.runtimes.delete(runtimeId);
      this.appendLog(theme.id, 'StudyHub', 'info', '停止しました。');
    }
    return this.status(theme);
  }

  run(
    theme: Theme,
    input: unknown,
    operationId?: string,
    values: Record<string, unknown> = {}
  ): Promise<RunResult> {
    return this.enqueueOperation(() => this.runSequential(theme, input, operationId, values));
  }

  private async runSequential(
    theme: Theme,
    input: unknown,
    operationId?: string,
    values: Record<string, unknown> = {}
  ): Promise<RunResult> {
    const run = theme.operations.run;
    if (!run) throw new Error('このテーマに実行操作はありません。');

    if (run.mode === 'request') {
      const selectedRequest = run.requests?.find((request) => request.id === operationId)
        ?? (run.requests?.length === 1 && !operationId ? run.requests[0] : undefined);
      if (run.requests?.length && !selectedRequest) {
        throw new Error('実行するAPI操作を選択してください。');
      }
      const requestUrlDefinition = selectedRequest?.url ?? run.url;
      if (!requestUrlDefinition) throw new Error('リクエスト先が定義されていません。');
      this.assertReady(theme);
      let resolvedUrl = requestUrlDefinition;
      const headers: Record<string, string> = {
        ...(selectedRequest?.headers ?? run.request?.headers ?? {})
      };
      const hasCookieHeader = Object.keys(headers).some((name) => name.toLowerCase() === 'cookie');
      const storedCookies = this.cookies.get(theme.id);
      if (!hasCookieHeader && storedCookies?.size) {
        headers.Cookie = [...storedCookies.entries()]
          .map(([name, value]) => `${name}=${value}`)
          .join('; ');
      }
      const configuredBody = selectedRequest?.body ?? run.request?.body;
      const requestBody: Record<string, unknown> = typeof configuredBody === 'object' && configuredBody !== null
        ? { ...configuredBody }
        : {};
      let hasInputBody = false;

      for (const definition of selectedRequest?.inputs ?? []) {
        const rawValue = values[definition.name];
        const isEmpty = rawValue === undefined || rawValue === null || rawValue === '';
        if (definition.required && isEmpty) {
          throw new Error(`${definition.label}を入力してください。`);
        }
        if (isEmpty) continue;
        let value: unknown = rawValue;
        if (definition.type === 'boolean') {
          if (rawValue === true || rawValue === 'true') value = true;
          else if (rawValue === false || rawValue === 'false') value = false;
          else throw new Error(`${definition.label}の指定が不正です。`);
        }
        if (definition.target === 'path') {
          resolvedUrl = resolvedUrl.replaceAll(`{${definition.name}}`, encodeURIComponent(String(value)));
        }
        if (definition.target === 'query') {
          const requestUrl = new URL(resolvedUrl);
          requestUrl.searchParams.set(definition.name, String(value));
          resolvedUrl = requestUrl.toString();
        }
        if (definition.target === 'header') headers[definition.name] = String(value);
        if (definition.target === 'body') {
          requestBody[definition.name] = value;
          hasInputBody = true;
        }
      }
      if (/\{[^}]+\}/.test(resolvedUrl)) throw new Error('URLに必要な値が入力されていません。');

      const requestUrl = new URL(resolvedUrl);
      const inputDefinition = run.request?.input;
      if (inputDefinition?.target === 'query') {
        requestUrl.searchParams.set(inputDefinition.name, String(input));
      }
      if (inputDefinition?.target === 'header') {
        headers[inputDefinition.name] = String(input);
      }
      if (inputDefinition?.target === 'body') {
        requestBody[inputDefinition.name] = input;
      }
      const hasConfiguredBody = selectedRequest
        ? selectedRequest.body !== undefined || hasInputBody
        : run.request
          ? run.request.body !== undefined || inputDefinition?.target === 'body'
          : true;
      const body = hasConfiguredBody
        ? typeof configuredBody === 'string' && !hasInputBody && inputDefinition?.target !== 'body'
          ? configuredBody
          : JSON.stringify(selectedRequest || run.request ? requestBody : { input })
        : undefined;
      if (body && !Object.keys(headers).some((name) => name.toLowerCase() === 'content-type')) {
        headers['content-type'] = 'application/json';
      }
      const timeoutMilliseconds = selectedRequest?.timeoutMilliseconds
        ?? (theme.timeoutSeconds ?? 10) * 1000;
      const executeRequest = async (): Promise<RunResult> => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMilliseconds);
        try {
          const response = await fetch(requestUrl, {
            method: selectedRequest?.method ?? run.method ?? 'POST',
            headers,
            ...(body ? { body } : {}),
            signal: controller.signal
          });
          const responseText = await response.text();
          let output: unknown = responseText;
          if (response.headers.get('content-type')?.includes('application/json')) {
            try {
              output = responseText ? JSON.parse(responseText) : null;
            } catch {
              output = responseText;
            }
          }
          const responseHeaders = Object.fromEntries(response.headers.entries()) as Record<string, string | string[]>;
          const getSetCookie = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
          const setCookies = getSetCookie?.call(response.headers)
            ?? (response.headers.get('set-cookie') ? [response.headers.get('set-cookie') as string] : []);
          if (setCookies.length) {
            responseHeaders['set-cookie'] = setCookies;
            this.updateCookies(theme.id, setCookies);
          }
          this.appendLog(
            theme.id,
            'request',
            response.ok ? 'info' : 'error',
            typeof output === 'string' ? output : JSON.stringify(output)
          );
          return { ok: response.ok, statusCode: response.status, headers: responseHeaders, output };
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            const output = { error: 'request_timeout', timeoutMilliseconds };
            this.appendLog(theme.id, 'request', 'error', JSON.stringify(output));
            return { ok: false, output };
          }
          throw error;
        } finally {
          clearTimeout(timer);
        }
      };

      const retry = selectedRequest?.retry;
      if (!retry) return await executeRequest();

      const attempts: Array<RunResult & { attempt: number }> = [];
      for (let attempt = 1; attempt <= retry.maxAttempts; attempt += 1) {
        const attemptResult = await executeRequest();
        attempts.push({ attempt, ...attemptResult });
        const shouldRetry = attempt < retry.maxAttempts
          && attemptResult.statusCode !== undefined
          && retry.statusCodes.includes(attemptResult.statusCode);
        if (!shouldRetry) {
          return {
            ...attemptResult,
            output: {
              attempts,
              final: attemptResult.output
            }
          };
        }
        this.appendLog(
          theme.id,
          'request',
          'info',
          `${retry.delayMilliseconds}ms待って再試行します。試行: ${attempt + 1}/${retry.maxAttempts}`
        );
        if (retry.delayMilliseconds > 0) {
          await new Promise((resolve) => setTimeout(resolve, retry.delayMilliseconds));
        }
      }
      throw new Error('再試行処理が完了しませんでした。');
    }

    const selectedCommand = run.commandOperations?.find((operation) => operation.id === operationId)
      ?? (run.commandOperations?.length === 1 && !operationId ? run.commandOperations[0] : undefined);
    if (run.commandOperations?.length && !selectedCommand) {
      throw new Error('実行するコマンド操作を選択してください。');
    }
    const selectedProcesses = selectedCommand?.processes ?? run.processes;
    if (!run.process && !selectedProcesses?.length) throw new Error('コマンドが定義されていません。');
    if (theme.lifecycle === 'stack') this.assertReady(theme);
    let result: RunResult;
    if (selectedProcesses?.length) {
      result = await this.runCommands(theme, selectedProcesses, input);
    } else {
      result = await this.runCommand(theme, run.process as ProcessDefinition, input);
    }
    if (run.autoStopAfterRun) await this.stopSequential(theme);
    return result;
  }

  checkField(field: Field): Promise<FieldCheckReport> {
    return this.enqueueOperation(() => this.checkFieldSequential(field));
  }

  private async checkFieldSequential(field: Field): Promise<FieldCheckReport> {
    if (!field.check) throw new Error('この分野に検証処理は登録されていません。');
    const logId = `field-check:${field.id}`;
    this.logs.delete(logId);
    const result = await this.runCommand(
      { id: logId, timeoutSeconds: field.check.timeoutSeconds },
      {
        id: 'validator',
        command: field.check.command,
        args: field.check.args,
        cwd: '.'
      },
      undefined
    );
    return { result, logs: this.entries(logId) };
  }

  inspectFieldReadiness(field: Field, themes: Theme[]): Promise<FieldReadinessReport> {
    return this.enqueueOperation(() => this.inspectFieldReadinessSequential(field, themes));
  }

  private async inspectFieldReadinessSequential(
    field: Field,
    themes: Theme[]
  ): Promise<FieldReadinessReport> {
    const requirements = new Set(themes.flatMap((theme) => theme.environment.required));
    const items: FieldReadinessItem[] = [];
    const requiresNode = requirements.has('Node.js') || field.check?.command === 'node' || field.check?.command === 'npm';
    const requiresPython = requirements.has('Python') || field.check?.command === 'python';

    if (requiresNode) {
      items.push({ id: 'node', label: 'Node.js', status: 'ready', message: process.version });
    }
    if (requiresPython) {
      items.push(await this.probeReadinessCommand(
        'python',
        'Python',
        process.platform === 'win32' ? 'rtk' : 'python3',
        process.platform === 'win32' ? ['python', '--version'] : ['--version'],
        'Pythonの実行環境が設定されていません。rtkのPython設定を確認してください。'
      ));
    }
    if (requirements.has('Docker Desktop')) {
      items.push(await this.probeReadinessCommand(
        'docker',
        'Docker Desktop',
        'docker',
        ['info', '--format', '{{.ServerVersion}}'],
        'Docker Desktopへ接続できません。起動状態とStudyHubの実行権限を確認してください。'
      ));
    }
    if (requirements.has('Git')) {
      items.push(await this.probeReadinessCommand('git', 'Git', 'git', ['--version']));
    }

    const entryCheck = this.inspectThemeEntries(themes);
    if (entryCheck.checked > 0) {
      items.push({
        id: 'theme-entry',
        label: 'テーマ固有の実行入口',
        status: entryCheck.errors.length ? 'missing' : 'ready',
        message: entryCheck.errors.length
          ? entryCheck.errors.join('\n')
          : `${entryCheck.checked}件の実行入口を確認しました。`
      });
    }
    if (requirements.has('Playwright Chromium')) {
      items.push({
        id: 'playwright-browser',
        label: 'Playwright Chromium',
        status: 'manual',
        message: 'ブラウザ本体は該当テーマを起動した時に確認します。'
      });
    }
    if (requirements.has('デスクトップセッション')) {
      items.push({
        id: 'desktop-session',
        label: 'デスクトップセッション',
        status: 'manual',
        message: '外部アプリが画面へ表示されることは、該当テーマの起動時に確認します。'
      });
    }
    if (items.length === 0) {
      items.push({ id: 'none', label: '追加の準備', status: 'ready', message: '追加の実行環境は不要です。' });
    }

    return {
      fieldId: field.id,
      checkedAt: new Date().toISOString(),
      ready: items.every((item) => item.status !== 'missing'),
      items
    };
  }

  entries(themeId: string): LogEntry[] {
    return [...(this.logs.get(themeId) ?? [])];
  }

  onLog(listener: (themeId: string, entry: LogEntry) => void): void {
    this.events.on('log', listener);
  }

  offLog(listener: (themeId: string, entry: LogEntry) => void): void {
    this.events.off('log', listener);
  }

  stopAll(): Promise<void> {
    return this.enqueueOperation(() => this.stopAllSequential());
  }

  private async stopAllSequential(): Promise<void> {
    for (const record of this.runtimes.values()) {
      await this.stopRecord(record);
    }
    this.runtimes.clear();
    this.cookies.clear();
  }

  private enqueueOperation<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operationTail.then(operation, operation);
    this.operationTail = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  private updateCookies(themeId: string, setCookies: string[]): void {
    const stored = this.cookies.get(themeId) ?? new Map<string, string>();
    for (const setCookie of setCookies) {
      const [pair, ...attributes] = setCookie.split(';').map((part) => part.trim());
      if (!pair) continue;
      const separator = pair.indexOf('=');
      if (separator < 1) continue;
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      const expired = value === ''
        || attributes.some((attribute) => /^max-age=0$/iu.test(attribute));
      if (expired) stored.delete(name);
      else stored.set(name, value);
    }
    if (stored.size) this.cookies.set(themeId, stored);
    else this.cookies.delete(themeId);
  }

  private spawnProcess(definition: ProcessDefinition, record: RuntimeRecord): ChildProcessWithoutNullStreams {
    const workingDirectory = this.resolveWorkingDirectory(definition);
    const resolvedCommand = this.resolveCommand(definition, workingDirectory);
    const child = spawn(resolvedCommand.command, resolvedCommand.args, {
      cwd: workingDirectory,
      env: { ...process.env, ...definition.env },
      shell: false,
      windowsHide: shouldHideProcessWindow(definition.command),
      stdio: 'pipe'
    });
    child.stdout.on('data', (chunk: Buffer) => {
      this.appendForConsumers(record, definition.id, 'info', chunk.toString('utf8').trimEnd());
    });
    child.stderr.on('data', (chunk: Buffer) => {
      this.appendForConsumers(record, definition.id, 'error', chunk.toString('utf8').trimEnd());
    });
    child.once('exit', (code) => {
      if (record.state === 'ready' || record.state === 'starting') {
        record.state = 'failed';
        record.message = `${definition.id} が終了しました。終了コード: ${String(code)}`;
        this.appendForConsumers(record, definition.id, 'error', record.message);
      }
    });
    child.once('error', (error) => {
      record.state = 'failed';
      record.message = error.message;
      this.appendForConsumers(record, definition.id, 'error', error.message);
    });
    return child;
  }

  private async runCommands(
    theme: Theme,
    definitions: ProcessDefinition[],
    input: unknown
  ): Promise<RunResult> {
    const needsTemporaryDirectory = definitions.some((definition) => definition.temporaryDirectoryEnv);
    const temporaryDirectory = needsTemporaryDirectory
      ? fs.mkdtempSync(path.join(os.tmpdir(), 'studyhub-command-'))
      : undefined;
    const results: Array<RunResult & { id: string }> = [];
    try {
      for (const definition of definitions) {
        const environmentOverrides = definition.temporaryDirectoryEnv && temporaryDirectory
          ? { [definition.temporaryDirectoryEnv]: temporaryDirectory }
          : undefined;
        const commandResult = await this.runCommand(theme, definition, input, environmentOverrides);
        results.push({ id: definition.id, ...commandResult });
        if (!commandResult.ok) {
          return {
            ok: false,
            ...(commandResult.exitCode !== undefined
              ? { exitCode: commandResult.exitCode }
              : {}),
            output: results
          };
        }
        if (definition.healthUrl) {
          await this.waitUntilReady(definition.healthUrl, theme.timeoutSeconds ?? 10);
        }
      }
      return {
        ok: true,
        exitCode: results.at(-1)?.exitCode ?? 0,
        output: results
      };
    } finally {
      if (temporaryDirectory) fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  }

  private async runCommand(
    theme: Pick<Theme, 'id' | 'timeoutSeconds'>,
    definition: ProcessDefinition,
    input: unknown,
    environmentOverrides?: Record<string, string>
  ): Promise<RunResult> {
    const workingDirectory = this.resolveWorkingDirectory(definition);
    const resolvedCommand = this.resolveCommand(definition, workingDirectory);
    const stdin = definition.stdinFile
      ? this.readProcessInputFile(definition.stdinFile)
      : JSON.stringify({ input });
    return await new Promise<RunResult>((resolve, reject) => {
      const child = spawn(resolvedCommand.command, resolvedCommand.args, {
        cwd: workingDirectory,
        env: { ...process.env, ...definition.env, ...environmentOverrides },
        shell: false,
        windowsHide: true,
        stdio: 'pipe'
      });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error('コマンドが制限時間を超えました。'));
      }, (theme.timeoutSeconds ?? 10) * 1000);
      child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
      child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once('close', (exitCode) => {
        clearTimeout(timer);
        const outputText = Buffer.concat(stdout).toString('utf8').trim();
        const errorText = Buffer.concat(stderr).toString('utf8').trim();
        if (outputText) this.appendLog(theme.id, definition.id, 'info', outputText);
        if (errorText) this.appendLog(theme.id, definition.id, 'error', errorText);
        let output: unknown = outputText;
        try {
          output = outputText ? JSON.parse(outputText) : errorText;
        } catch {
          output = outputText;
        }
        resolve({ ok: exitCode === 0, exitCode, output });
      });
      child.stdin.end(stdin, 'utf8');
    });
  }

  private async runTask(
    definition: ProcessDefinition,
    record: RuntimeRecord,
    timeoutSeconds: number
  ): Promise<void> {
    const workingDirectory = this.resolveWorkingDirectory(definition);
    const resolvedCommand = this.resolveCommand(definition, workingDirectory);
    const stdin = definition.stdinFile
      ? this.readProcessInputFile(definition.stdinFile)
      : undefined;
    await new Promise<void>((resolve, reject) => {
      const child = spawn(resolvedCommand.command, resolvedCommand.args, {
        cwd: workingDirectory,
        env: { ...process.env, ...definition.env },
        shell: false,
        windowsHide: true,
        stdio: 'pipe'
      });
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`${definition.id}が制限時間を超えました。`));
      }, timeoutSeconds * 1000);
      child.stdout.on('data', (chunk: Buffer) => {
        this.appendForConsumers(record, definition.id, 'info', chunk.toString('utf8').trimEnd());
      });
      child.stderr.on('data', (chunk: Buffer) => {
        this.appendForConsumers(record, definition.id, 'error', chunk.toString('utf8').trimEnd());
      });
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once('close', (exitCode) => {
        clearTimeout(timer);
        if (exitCode === 0 || definition.allowFailure) resolve();
        else reject(new Error(`${definition.id}が終了コード${String(exitCode)}で失敗しました。`));
      });
      if (stdin !== undefined) child.stdin.end(stdin, 'utf8');
      else child.stdin.end();
    });
  }

  private readProcessInputFile(relativePath: string): string {
    if (path.isAbsolute(relativePath)) {
      throw new Error(`標準入力ファイルは相対パスで指定してください: ${relativePath}`);
    }
    const resolved = path.resolve(this.repositoryDirectory, relativePath);
    if (!resolved.startsWith(`${this.repositoryDirectory}${path.sep}`) || !fs.existsSync(resolved)) {
      throw new Error(`標準入力ファイルを確認できません: ${relativePath}`);
    }
    const realRoot = fs.realpathSync(this.repositoryDirectory);
    const realPath = fs.realpathSync(resolved);
    if (!realPath.startsWith(`${realRoot}${path.sep}`) || !fs.statSync(realPath).isFile()) {
      throw new Error(`標準入力ファイルがリポジトリの外を参照しています: ${relativePath}`);
    }
    if (fs.statSync(realPath).size > 2 * 1024 * 1024) {
      throw new Error(`標準入力ファイルが上限を超えています: ${relativePath}`);
    }
    const bytes = fs.readFileSync(realPath);
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      throw new Error(`標準入力ファイルにUTF-8 BOMは使用できません: ${relativePath}`);
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }

  private resolveWorkingDirectory(definition: ProcessDefinition): string {
    if (!definition.cwd) return this.workingDirectory;
    if (path.isAbsolute(definition.cwd)) {
      throw new Error(`作業フォルダは相対パスで指定してください: ${definition.cwd}`);
    }
    const resolved = path.resolve(this.repositoryDirectory, definition.cwd);
    if ((resolved !== this.repositoryDirectory && !resolved.startsWith(`${this.repositoryDirectory}${path.sep}`))
      || !fs.existsSync(resolved)) {
      throw new Error(`作業フォルダを確認できません: ${definition.cwd}`);
    }
    const realRoot = fs.realpathSync(this.repositoryDirectory);
    const realPath = fs.realpathSync(resolved);
    if ((realPath !== realRoot && !realPath.startsWith(`${realRoot}${path.sep}`))
      || !fs.statSync(realPath).isDirectory()) {
      throw new Error(`作業フォルダがリポジトリの外を参照しています: ${definition.cwd}`);
    }
    return realPath;
  }

  private inspectThemeEntries(themes: Theme[]): { checked: number; errors: string[] } {
    const errors: string[] = [];
    let checked = 0;
    for (const theme of themes) {
      for (const definition of this.themeProcessDefinitions(theme)) {
        if (!['node', 'npm', 'python', 'python-venv', 'electron'].includes(definition.command)) continue;
        checked += 1;
        try {
          const workingDirectory = this.resolveWorkingDirectory(definition);
          this.resolveCommand(definition, workingDirectory);
          if (definition.command === 'npm') this.assertNpmDependencies(definition, workingDirectory);
        } catch (error) {
          errors.push(`${theme.id}: ${error instanceof Error ? error.message : '実行入口を確認できません。'}`);
        }
      }
    }
    return { checked, errors: [...new Set(errors)] };
  }

  private themeProcessDefinitions(theme: Theme): ProcessDefinition[] {
    const run = theme.operations.run;
    return [
      ...(theme.operations.start?.processes ?? []),
      ...(run?.process ? [run.process] : []),
      ...(run?.processes ?? []),
      ...(run?.commandOperations?.flatMap((operation) => operation.processes) ?? [])
    ];
  }

  private assertNpmDependencies(definition: ProcessDefinition, workingDirectory: string): void {
    const prefixIndex = definition.args.indexOf('--prefix');
    const prefix = prefixIndex >= 0 ? definition.args[prefixIndex + 1] : undefined;
    const dependencyDirectory = prefix
      ? this.resolveWorkingDirectory({ ...definition, cwd: prefix })
      : workingDirectory;
    const packageFile = path.join(dependencyDirectory, 'package.json');
    if (!fs.existsSync(packageFile)) return;
    const packageJson = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(packageFile))) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };
    const dependencyCount = Object.keys(packageJson.dependencies ?? {}).length
      + Object.keys(packageJson.devDependencies ?? {}).length
      + Object.keys(packageJson.optionalDependencies ?? {}).length;
    if (dependencyCount > 0 && !fs.existsSync(path.join(dependencyDirectory, 'node_modules'))) {
      throw new Error(`依存パッケージが準備されていません: ${path.relative(this.repositoryDirectory, dependencyDirectory)}`);
    }
  }

  private async probeReadinessCommand(
    id: string,
    label: string,
    command: string,
    args: string[],
    failureMessage?: string
  ): Promise<FieldReadinessItem> {
    return await new Promise<FieldReadinessItem>((resolve) => {
      const output: Buffer[] = [];
      const child = spawn(command, args, {
        cwd: this.repositoryDirectory,
        env: process.env,
        shell: false,
        windowsHide: true,
        stdio: 'pipe'
      });
      let completed = false;
      const finish = (status: 'ready' | 'missing', message: string) => {
        if (completed) return;
        completed = true;
        clearTimeout(timer);
        resolve({ id, label, status, message });
      };
      const timer = setTimeout(() => {
        child.kill();
        finish('missing', '確認が制限時間を超えました。');
      }, 8000);
      child.stdout.on('data', (chunk: Buffer) => output.push(chunk));
      child.stderr.on('data', (chunk: Buffer) => output.push(chunk));
      child.once('error', (error) => finish('missing', failureMessage ?? error.message));
      child.once('close', (code) => {
        const message = stripAnsiControlSequences(Buffer.concat(output).toString('utf8')).trim();
        finish(
          code === 0 ? 'ready' : 'missing',
          code === 0 ? (message || '確認できました。') : (failureMessage ?? (message || `終了コード: ${String(code)}`))
        );
      });
    });
  }

  private assertExecutableEntry(definition: ProcessDefinition, workingDirectory: string): void {
    const entry = definition.args[0];
    if (!entry || path.isAbsolute(entry)) {
      throw new Error('Node.jsの実行入口が不正です。');
    }
    const resolved = path.resolve(workingDirectory, entry);
    if (!resolved.startsWith(`${workingDirectory}${path.sep}`)) {
      throw new Error(`実行入口が作業フォルダの外を参照しています: ${entry}`);
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      throw new Error(`実行入口が見つかりません。依存パッケージを確認してください: ${entry}`);
    }
  }

  private assertPythonEntry(definition: ProcessDefinition, workingDirectory: string): void {
    const entry = definition.args.find((argument) => (
      argument.toLowerCase().endsWith('.py') && !argument.includes('*') && !argument.includes('?')
    ));
    if (!entry) return;
    if (path.isAbsolute(entry)) throw new Error('Pythonの実行入口が不正です。');
    const resolved = path.resolve(workingDirectory, entry);
    if (!resolved.startsWith(`${workingDirectory}${path.sep}`)) {
      throw new Error(`実行入口が作業フォルダの外を参照しています: ${entry}`);
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      throw new Error(`Pythonの実行入口が見つかりません: ${entry}`);
    }
  }

  private resolveVirtualEnvironmentPython(workingDirectory: string): string {
    const executableName = process.platform === 'win32' ? 'python.exe' : 'python';
    const scriptDirectory = process.platform === 'win32' ? 'Scripts' : 'bin';
    const candidates = [
      path.resolve(workingDirectory, 'venv', scriptDirectory, executableName),
      path.resolve(workingDirectory, '..', 'venv', scriptDirectory, executableName)
    ];
    const executable = candidates.find((candidate) => (
      candidate.startsWith(`${this.repositoryDirectory}${path.sep}`)
      && fs.existsSync(candidate)
      && fs.statSync(candidate).isFile()
    ));
    if (!executable) {
      throw new Error('テーマのPython仮想環境が準備されていません。テーマの手順に従ってvenvを作成してください。');
    }
    return executable;
  }

  private resolveCommand(definition: ProcessDefinition, workingDirectory: string): ResolvedCommand {
    if (definition.command === 'node') {
      this.assertExecutableEntry(definition, workingDirectory);
      return { command: process.execPath, args: definition.args };
    }
    if (definition.command === 'npm') {
      const npmExecutable = process.env.npm_execpath;
      if (npmExecutable && fs.existsSync(npmExecutable) && fs.statSync(npmExecutable).isFile()) {
        return { command: process.execPath, args: [npmExecutable, ...definition.args] };
      }
      return {
        command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
        args: definition.args
      };
    }
    if (definition.command === 'python') {
      this.assertPythonEntry(definition, workingDirectory);
      return {
        command: process.platform === 'win32' ? 'rtk' : 'python3',
        args: process.platform === 'win32'
          ? ['python', ...definition.args]
          : definition.args
      };
    }
    if (definition.command === 'python-venv') {
      return {
        command: this.resolveVirtualEnvironmentPython(workingDirectory),
        args: definition.args
      };
    }
    if (definition.command === 'electron') {
      const electronRoot = path.resolve(workingDirectory, 'node_modules', 'electron');
      const pathFile = path.join(electronRoot, 'path.txt');
      if (!fs.existsSync(pathFile) || !fs.statSync(pathFile).isFile()) {
        throw new Error(
          'Electron実行ファイルが準備されていません。テーマのフォルダでnpm run setup:electronを実行してください。'
        );
      }
      const relativeExecutable = new TextDecoder('utf-8', { fatal: true })
        .decode(fs.readFileSync(pathFile))
        .trim();
      const distributionRoot = path.join(electronRoot, 'dist');
      const executable = path.resolve(distributionRoot, relativeExecutable);
      if (!relativeExecutable
        || path.isAbsolute(relativeExecutable)
        || !executable.startsWith(`${distributionRoot}${path.sep}`)
        || !fs.existsSync(executable)
        || !fs.statSync(executable).isFile()) {
        throw new Error(
          'Electronの実行ファイルを確認できません。npm run setup:electronをやり直してください。'
        );
      }
      return { command: executable, args: definition.args };
    }
    if (definition.command === 'docker') return { command: 'docker', args: definition.args };
    throw new Error(`許可されていないコマンドです: ${definition.command}`);
  }

  private assertReady(theme: Theme): void {
    const runtimeId = theme.operations.start?.runtimeId;
    const record = runtimeId ? this.runtimes.get(runtimeId) : undefined;
    if (!record || record.state !== 'ready') {
      throw new Error('先に実行環境を起動してください。');
    }
  }

  private async waitUntilReady(url: string, timeoutSeconds: number): Promise<void> {
    const deadline = Date.now() + timeoutSeconds * 1000;
    while (Date.now() < deadline) {
      const controller = new AbortController();
      const probeTimeout = setTimeout(
        () => controller.abort(),
        Math.min(1000, Math.max(1, deadline - Date.now()))
      );
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (response.status < 500) return;
      } catch {
        // 起動途中は接続できないため、期限内だけ再確認します。
      } finally {
        clearTimeout(probeTimeout);
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    throw new Error(`起動確認が制限時間を超えました: ${url}`);
  }

  private async waitUntilSpawned(
    child: ChildProcessWithoutNullStreams,
    timeoutSeconds: number
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error('プロセスの起動が制限時間を超えました。'));
      }, timeoutSeconds * 1000);
      const complete = (action: () => void) => {
        clearTimeout(timer);
        child.off('spawn', onSpawn);
        child.off('error', onError);
        action();
      };
      function onSpawn() {
        complete(resolve);
      }
      function onError(error: Error) {
        complete(() => reject(error));
      }
      child.once('spawn', onSpawn);
      child.once('error', onError);
    });
  }

  private async stopRecord(record: RuntimeRecord): Promise<void> {
    record.state = 'stopping';
    record.message = '停止しています。';
    try {
      await this.stopChildren(record);
      await this.runCleanup(record);
      record.exposed = [];
      record.state = 'stopped';
      record.message = '停止しました。';
    } catch (error) {
      record.state = 'failed';
      record.exposed = [];
      record.message = error instanceof Error ? error.message : '後片付けに失敗しました。';
      this.appendForConsumers(record, 'StudyHub', 'error', record.message);
    }
  }

  private async runCleanup(record: RuntimeRecord): Promise<void> {
    for (const definition of record.cleanup) {
      await this.runTask(definition, record, record.timeoutSeconds);
    }
  }

  private async stopChildren(record: RuntimeRecord): Promise<void> {
    const processes = [...record.processes].reverse();
    record.processes = [];
    for (const { child } of processes) {
      await this.stopChild(child);
    }
  }

  private async stopChild(child: ChildProcessWithoutNullStreams): Promise<void> {
    if (child.exitCode !== null) return;
    await new Promise<void>((resolve) => {
      let completed = false;
      let timeout: NodeJS.Timeout | undefined;
      const complete = () => {
        if (completed) return;
        completed = true;
        if (timeout) clearTimeout(timeout);
        resolve();
      };
      child.once('close', complete);
      if (process.platform === 'win32' && child.pid !== undefined) {
        const taskkill = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
          windowsHide: true,
          stdio: 'ignore'
        });
        taskkill.once('close', (code) => {
          if (code !== 0 && child.exitCode === null) child.kill();
        });
        taskkill.once('error', () => {
          if (child.exitCode === null) child.kill();
        });
      } else {
        child.kill();
      }
      timeout = setTimeout(() => {
        if (child.exitCode === null) child.kill('SIGKILL');
        complete();
      }, 2000);
      timeout.unref();
    });
  }

  private appendForConsumers(
    record: RuntimeRecord,
    source: string,
    level: 'info' | 'error',
    message: string
  ): void {
    for (const themeId of record.consumers) this.appendLog(themeId, source, level, message);
  }

  private appendLog(themeId: string, source: string, level: 'info' | 'error', message: string): void {
    const sanitizedMessage = stripAnsiControlSequences(message);
    if (!sanitizedMessage) return;
    const entry: LogEntry = {
      sequence: ++this.sequence,
      time: new Date().toISOString(),
      source,
      level,
      message: sanitizedMessage
    };
    const entries = this.logs.get(themeId) ?? [];
    entries.push(entry);
    if (entries.length > 500) entries.splice(0, entries.length - 500);
    this.logs.set(themeId, entries);
    this.events.emit('log', themeId, entry);
  }
}
