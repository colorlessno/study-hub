import type {
  CatalogMode,
  Field,
  FieldCheckReport,
  FieldReadinessReport,
  RunResult,
  RuntimeView,
  Theme,
  ThemeChecklist,
  ThemeResourceContent,
  ThemeSummary
} from '../../shared/catalog';

type ApiEnvelope<T> = { data: T } | { error: { code: string; message: string } };

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const responseText = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(responseText);
  } catch {
    throw new ApiError(
      response.ok ? 'サーバーの応答形式が不正です。' : `通信に失敗しました。HTTP ${response.status}`,
      response.status,
      response.ok ? 'INVALID_RESPONSE' : 'HTTP_ERROR'
    );
  }
  if (!body || typeof body !== 'object') {
    throw new ApiError('サーバーの応答形式が不正です。', response.status, 'INVALID_RESPONSE');
  }
  const envelope = body as ApiEnvelope<T>;
  if (!response.ok || 'error' in envelope) {
    const message = 'error' in envelope
      ? envelope.error.message
      : `通信に失敗しました。HTTP ${response.status}`;
    const code = 'error' in envelope ? envelope.error.code : 'HTTP_ERROR';
    throw new ApiError(message, response.status, code);
  }
  if (!('data' in envelope)) {
    throw new ApiError('サーバーの応答形式が不正です。', response.status, 'INVALID_RESPONSE');
  }
  return envelope.data;
}

function catalogQuery(catalog: CatalogMode): string {
  return `catalog=${encodeURIComponent(catalog)}`;
}

export async function getFields(catalog: CatalogMode): Promise<Field[]> {
  const response = await requestJson<{ fields: Field[] }>(`/api/fields?${catalogQuery(catalog)}`);
  return response.fields;
}

export async function getChecklists(catalog: CatalogMode): Promise<ThemeChecklist[]> {
  const response = await requestJson<{ checklists: ThemeChecklist[] }>(
    `/api/checklists?${catalogQuery(catalog)}`
  );
  return response.checklists;
}

export async function getFieldReadme(
  fieldId: string,
  catalog: CatalogMode
): Promise<{ format: 'markdown'; entryFile: string; content: string }> {
  return await requestJson<{ format: 'markdown'; entryFile: string; content: string }>(
    `/api/fields/${encodeURIComponent(fieldId)}/readme?${catalogQuery(catalog)}`
  );
}

export async function runFieldCheck(fieldId: string, catalog: CatalogMode): Promise<FieldCheckReport> {
  const response = await requestJson<{ report: FieldCheckReport }>(
    `/api/fields/${encodeURIComponent(fieldId)}/check?${catalogQuery(catalog)}`,
    { method: 'POST' }
  );
  return response.report;
}

export async function inspectFieldReadiness(
  fieldId: string,
  catalog: CatalogMode
): Promise<FieldReadinessReport> {
  const response = await requestJson<{ report: FieldReadinessReport }>(
    `/api/fields/${encodeURIComponent(fieldId)}/readiness?${catalogQuery(catalog)}`,
    { method: 'POST' }
  );
  return response.report;
}

export async function getThemes(fieldId: string | undefined, catalog: CatalogMode): Promise<ThemeSummary[]> {
  if (!fieldId) return [];
  const response = await requestJson<{ themes: ThemeSummary[] }>(
    `/api/fields/${encodeURIComponent(fieldId)}/themes?${catalogQuery(catalog)}`
  );
  return response.themes;
}

export async function getTheme(themeId: string, catalog: CatalogMode): Promise<Theme> {
  const response = await requestJson<{ theme: Theme }>(
    `/api/themes/${encodeURIComponent(themeId)}?${catalogQuery(catalog)}`
  );
  return response.theme;
}

export async function getThemeMaterial(
  themeId: string,
  catalog: CatalogMode
): Promise<{ format: 'markdown'; entryFile: string; content: string }> {
  return await requestJson<{ format: 'markdown'; entryFile: string; content: string }>(
    `/api/themes/${encodeURIComponent(themeId)}/material?${catalogQuery(catalog)}`
  );
}

export async function getThemeReadme(
  themeId: string,
  catalog: CatalogMode
): Promise<{ format: 'markdown'; entryFile: string; content: string }> {
  return await requestJson<{ format: 'markdown'; entryFile: string; content: string }>(
    `/api/themes/${encodeURIComponent(themeId)}/readme?${catalogQuery(catalog)}`
  );
}

export async function getThemeResource(
  themeId: string,
  resourceId: string,
  catalog: CatalogMode
): Promise<ThemeResourceContent> {
  const response = await requestJson<{ resource: ThemeResourceContent }>(
    `/api/themes/${encodeURIComponent(themeId)}/resources/${encodeURIComponent(resourceId)}`
      + `?${catalogQuery(catalog)}`
  );
  return response.resource;
}

export async function getRuntime(themeId: string, catalog: CatalogMode): Promise<RuntimeView> {
  const response = await requestJson<{ runtime: RuntimeView }>(
    `/api/themes/${encodeURIComponent(themeId)}/runtime?${catalogQuery(catalog)}`
  );
  return response.runtime;
}

export async function startRuntime(themeId: string, catalog: CatalogMode): Promise<RuntimeView> {
  const response = await requestJson<{ runtime: RuntimeView }>(
    `/api/themes/${encodeURIComponent(themeId)}/start?${catalogQuery(catalog)}`,
    { method: 'POST' }
  );
  return response.runtime;
}

export async function stopRuntime(themeId: string, catalog: CatalogMode): Promise<RuntimeView> {
  const response = await requestJson<{ runtime: RuntimeView }>(
    `/api/themes/${encodeURIComponent(themeId)}/stop?${catalogQuery(catalog)}`,
    { method: 'POST' }
  );
  return response.runtime;
}

export async function recheckRuntime(themeId: string, catalog: CatalogMode): Promise<RuntimeView> {
  const response = await requestJson<{ runtime: RuntimeView }>(
    `/api/themes/${encodeURIComponent(themeId)}/recheck?${catalogQuery(catalog)}`,
    { method: 'POST' }
  );
  return response.runtime;
}

export async function runTheme(
  themeId: string,
  input: string,
  catalog: CatalogMode,
  operationId?: string,
  values?: Record<string, string | boolean>
): Promise<RunResult> {
  const response = await requestJson<{ result: RunResult }>(
    `/api/themes/${encodeURIComponent(themeId)}/run?${catalogQuery(catalog)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input, operationId, values })
    }
  );
  return response.result;
}

export function materialUrl(path: string): string {
  return `/sample-materials/${path.split('/').map(encodeURIComponent).join('/')}`;
}
