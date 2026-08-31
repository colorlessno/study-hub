import type { RunResult } from '../../shared/catalog';

type ProcessResult = {
  id: string;
  ok: boolean;
  exitCode?: number | null;
  output?: unknown;
};

function isProcessResult(value: unknown): value is ProcessResult {
  return typeof value === 'object'
    && value !== null
    && typeof Reflect.get(value, 'id') === 'string'
    && typeof Reflect.get(value, 'ok') === 'boolean';
}

function formatProcessResult(result: ProcessResult): string {
  const status = result.ok ? '成功' : '失敗';
  const exitCode = result.exitCode === undefined ? '' : `（終了コード: ${result.exitCode ?? 'なし'}）`;
  const heading = `[${result.id}] ${status}${exitCode}`;
  if (result.output === undefined || result.output === '') return heading;
  const output = typeof result.output === 'string'
    ? result.output
    : JSON.stringify(result.output, null, 2);
  return `${heading}\n${output}`;
}

export function formatRunResult(result: RunResult): string {
  if (Array.isArray(result.output) && result.output.every(isProcessResult)) {
    return result.output.map(formatProcessResult).join('\n\n');
  }
  return JSON.stringify(result, null, 2);
}
