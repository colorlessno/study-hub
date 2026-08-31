import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  readActualFieldReadme,
  readActualStaticMaterial,
  readActualThemeReadme,
  readActualTextMaterial,
  readThemeResource,
  type Catalog
} from '../catalog/loader.js';
import type { RuntimeManager } from '../runtime/manager.js';
import type { CatalogMode, LogEntry, RuntimeView, Theme } from '../../shared/catalog.js';

interface ThemeParams {
  id: string;
}

interface FieldParams {
  fieldId: string;
}

interface StaticMaterialParams {
  id: string;
  '*': string;
}

interface ThemeResourceParams extends ThemeParams {
  resourceId: string;
}

interface CatalogQuery {
  catalog?: string;
}

interface RunBody {
  input?: unknown;
  operationId?: unknown;
  values?: unknown;
}

function isRunValues(value: unknown): value is Record<string, string | boolean> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && Object.values(value).every((item) => typeof item === 'string' || typeof item === 'boolean');
}

function resolveCatalog(
  catalogs: Record<CatalogMode, Catalog>,
  requested: string | undefined,
  reply: FastifyReply
): Catalog | undefined {
  if (requested === undefined || requested === 'sample') return catalogs.sample;
  if (requested === 'actual') return catalogs.actual;
  void reply.code(400).send({
    error: { code: 'CATALOG_INVALID', message: 'カタログの指定が不正です。' }
  });
  return undefined;
}

function metadataRuntime(theme: Theme): RuntimeView {
  return {
    themeId: theme.id,
    runtimeId: null,
    state: 'unavailable',
    message: '実教材の実行接続はまだ設定されていません。',
    processes: [],
    consumers: []
  };
}

function themeRuntime(theme: Theme, runtimeManager: RuntimeManager): RuntimeView {
  return theme.integrationStatus === 'metadata-only'
    ? metadataRuntime(theme)
    : runtimeManager.status(theme);
}

function rejectMetadataTheme(reply: FastifyReply): FastifyReply {
  return reply.code(409).send({
    error: {
      code: 'THEME_NOT_CONNECTED',
      message: '実教材の実行接続はまだ設定されていません。'
    }
  });
}

function themeOperationCount(theme: Theme): number {
  const run = theme.operations.run;
  if (run?.requests) return run.requests.length;
  if (run?.commandOperations) return run.commandOperations.length;
  if (run) return 1;
  if (theme.operations.open) return 1;
  return 0;
}

export async function registerApi(
  app: FastifyInstance,
  catalogs: Record<CatalogMode, Catalog>,
  runtimeManager: RuntimeManager
): Promise<void> {
  app.get<{ Params: StaticMaterialParams }>('/actual-materials/:id/*', async (request, reply) => {
    const theme = catalogs.actual.themeById.get(request.params.id);
    if (!theme) return await reply.code(404).send('テーマが見つかりません。');
    try {
      const material = readActualStaticMaterial(theme, request.params['*']);
      return await reply
        .header('cache-control', 'no-store')
        .header('x-content-type-options', 'nosniff')
        .header(
          'content-security-policy',
          "default-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'"
        )
        .type(material.contentType)
        .send(material.body);
    } catch (error) {
      return await reply.code(404).send(
        error instanceof Error ? error.message : '静的Web教材を読み込めません。'
      );
    }
  });

  app.get<{ Querystring: CatalogQuery }>('/api/fields', async (request, reply) => {
    const catalog = resolveCatalog(catalogs, request.query.catalog, reply);
    if (!catalog) return reply;
    return { data: { catalog: catalog.mode, fields: catalog.fields } };
  });

  app.get<{ Querystring: CatalogQuery }>('/api/checklists', async (request, reply) => {
    const catalog = resolveCatalog(catalogs, request.query.catalog, reply);
    if (!catalog) return reply;
    return { data: { catalog: catalog.mode, checklists: catalog.checklists } };
  });

  app.get<{ Params: FieldParams; Querystring: CatalogQuery }>(
    '/api/fields/:fieldId/readme',
    async (request, reply) => {
      const catalog = resolveCatalog(catalogs, request.query.catalog, reply);
      if (!catalog) return reply;
      const field = catalog.fields.find((item) => item.id === request.params.fieldId);
      if (!field) return await reply.code(404).send({
        error: { code: 'FIELD_NOT_FOUND', message: '分野が見つかりません。' }
      });
      if (catalog.mode !== 'actual') {
        return await reply.code(409).send({
          error: { code: 'README_NOT_AVAILABLE', message: '実分野のREADMEだけを表示できます。' }
        });
      }
      try {
        return { data: { format: 'markdown', ...readActualFieldReadme(field) } };
      } catch (error) {
        return await reply.code(422).send({
          error: {
            code: 'README_READ_FAILED',
            message: error instanceof Error ? error.message : 'READMEを読み込めません。'
          }
        });
      }
    }
  );

  app.get<{ Params: FieldParams; Querystring: CatalogQuery }>(
    '/api/fields/:fieldId/themes',
    async (request, reply) => {
      const catalog = resolveCatalog(catalogs, request.query.catalog, reply);
      if (!catalog) return reply;
      if (!catalog.fields.some((field) => field.id === request.params.fieldId)) {
        return await reply.code(404).send({
          error: { code: 'FIELD_NOT_FOUND', message: '分野が見つかりません。' }
        });
      }
      const themes = catalog.themes
        .filter((theme) => theme.fieldId === request.params.fieldId)
        .map((theme) => ({
          id: theme.id,
          fieldId: theme.fieldId,
          name: theme.name,
          summary: theme.summary,
          presentation: theme.presentation,
          lifecycle: theme.lifecycle,
          integrationStatus: theme.integrationStatus,
          integrationMode: theme.integrationMode,
          runtimeState: themeRuntime(theme, runtimeManager).state,
          environment: theme.environment.required,
          operationCount: themeOperationCount(theme),
          ...(theme.group ? { group: theme.group } : {}),
          ...(theme.listProfile ? { listProfile: theme.listProfile } : {})
        }));
      return { data: { catalog: catalog.mode, themes } };
    }
  );

  app.post<{ Params: FieldParams; Querystring: CatalogQuery }>(
    '/api/fields/:fieldId/check',
    async (request, reply) => {
      const catalog = resolveCatalog(catalogs, request.query.catalog, reply);
      if (!catalog) return reply;
      const field = catalog.fields.find((item) => item.id === request.params.fieldId);
      if (!field) return await reply.code(404).send({
        error: { code: 'FIELD_NOT_FOUND', message: '分野が見つかりません。' }
      });
      if (catalog.mode !== 'actual' || !field.check) {
        return await reply.code(409).send({
          error: { code: 'FIELD_CHECK_NOT_AVAILABLE', message: 'この分野に検証処理は登録されていません。' }
        });
      }
      try {
        return { data: { report: await runtimeManager.checkField(field) } };
      } catch (error) {
        return await reply.code(422).send({
          error: {
            code: 'FIELD_CHECK_FAILED',
            message: error instanceof Error ? error.message : '分野の検証を実行できません。'
          }
        });
      }
    }
  );

  app.post<{ Params: FieldParams; Querystring: CatalogQuery }>(
    '/api/fields/:fieldId/readiness',
    async (request, reply) => {
      const catalog = resolveCatalog(catalogs, request.query.catalog, reply);
      if (!catalog) return reply;
      const field = catalog.fields.find((item) => item.id === request.params.fieldId);
      if (!field) return await reply.code(404).send({
        error: { code: 'FIELD_NOT_FOUND', message: '分野が見つかりません。' }
      });
      if (catalog.mode !== 'actual') {
        return await reply.code(409).send({
          error: { code: 'FIELD_READINESS_NOT_AVAILABLE', message: '実分野だけ準備状態を確認できます。' }
        });
      }
      const themes = catalog.themes.filter((theme) => theme.fieldId === field.id);
      return { data: { report: await runtimeManager.inspectFieldReadiness(field, themes) } };
    }
  );

  app.get<{ Params: ThemeParams; Querystring: CatalogQuery }>('/api/themes/:id', async (request, reply) => {
    const catalog = resolveCatalog(catalogs, request.query.catalog, reply);
    if (!catalog) return reply;
    const theme = catalog.themeById.get(request.params.id);
    if (!theme) return await reply.code(404).send({
      error: { code: 'THEME_NOT_FOUND', message: 'テーマが見つかりません。' }
    });
    return { data: { catalog: catalog.mode, theme } };
  });

  app.get<{ Params: ThemeParams; Querystring: CatalogQuery }>(
    '/api/themes/:id/material',
    async (request, reply) => {
      const catalog = resolveCatalog(catalogs, request.query.catalog, reply);
      if (!catalog) return reply;
      const theme = catalog.themeById.get(request.params.id);
      if (!theme) return await reply.code(404).send({
        error: { code: 'THEME_NOT_FOUND', message: 'テーマが見つかりません。' }
      });
      if (catalog.mode !== 'actual' || theme.integrationStatus !== 'connected') {
        return await reply.code(409).send({
          error: { code: 'MATERIAL_NOT_CONNECTED', message: '教材表示はまだ接続されていません。' }
        });
      }
      try {
        return { data: { format: 'markdown', ...readActualTextMaterial(theme) } };
      } catch (error) {
        return await reply.code(422).send({
          error: {
            code: 'MATERIAL_READ_FAILED',
            message: error instanceof Error ? error.message : '教材を読み込めません。'
          }
        });
      }
    }
  );

  app.get<{ Params: ThemeParams; Querystring: CatalogQuery }>(
    '/api/themes/:id/readme',
    async (request, reply) => {
      const catalog = resolveCatalog(catalogs, request.query.catalog, reply);
      if (!catalog) return reply;
      const theme = catalog.themeById.get(request.params.id);
      if (!theme) return await reply.code(404).send({
        error: { code: 'THEME_NOT_FOUND', message: 'テーマが見つかりません。' }
      });
      if (catalog.mode !== 'actual') {
        return await reply.code(409).send({
          error: { code: 'README_NOT_AVAILABLE', message: '実テーマのREADMEだけを表示できます。' }
        });
      }
      try {
        return { data: { format: 'markdown', ...readActualThemeReadme(theme) } };
      } catch (error) {
        return await reply.code(422).send({
          error: {
            code: 'README_READ_FAILED',
            message: error instanceof Error ? error.message : 'READMEを読み込めません。'
          }
        });
      }
    }
  );

  app.get<{ Params: ThemeResourceParams; Querystring: CatalogQuery }>(
    '/api/themes/:id/resources/:resourceId',
    async (request, reply) => {
      const catalog = resolveCatalog(catalogs, request.query.catalog, reply);
      if (!catalog) return reply;
      const theme = catalog.themeById.get(request.params.id);
      if (!theme) return await reply.code(404).send({
        error: { code: 'THEME_NOT_FOUND', message: 'テーマが見つかりません。' }
      });
      if (!theme.resources?.some((resource) => resource.id === request.params.resourceId)) {
        return await reply.code(404).send({
          error: { code: 'RESOURCE_NOT_FOUND', message: '関連ファイルが見つかりません。' }
        });
      }
      try {
        return {
          data: { resource: readThemeResource(theme, request.params.resourceId, catalog.mode) }
        };
      } catch (error) {
        return await reply.code(422).send({
          error: {
            code: 'RESOURCE_READ_FAILED',
            message: error instanceof Error ? error.message : '関連ファイルを読み込めません。'
          }
        });
      }
    }
  );

  app.get<{ Params: ThemeParams; Querystring: CatalogQuery }>(
    '/api/themes/:id/runtime',
    async (request, reply) => {
      const catalog = resolveCatalog(catalogs, request.query.catalog, reply);
      if (!catalog) return reply;
      const theme = catalog.themeById.get(request.params.id);
      if (!theme) return await reply.code(404).send({
        error: { code: 'THEME_NOT_FOUND', message: 'テーマが見つかりません。' }
      });
      return { data: { runtime: themeRuntime(theme, runtimeManager) } };
    }
  );

  app.post<{ Params: ThemeParams; Querystring: CatalogQuery }>(
    '/api/themes/:id/start',
    async (request, reply) => {
      const catalog = resolveCatalog(catalogs, request.query.catalog, reply);
      if (!catalog) return reply;
      const theme = catalog.themeById.get(request.params.id);
      if (!theme) return await reply.code(404).send({
        error: { code: 'THEME_NOT_FOUND', message: 'テーマが見つかりません。' }
      });
      if (theme.integrationStatus === 'metadata-only') return rejectMetadataTheme(reply);
      return { data: { runtime: await runtimeManager.start(theme) } };
    }
  );

  app.post<{ Params: ThemeParams; Querystring: CatalogQuery }>(
    '/api/themes/:id/stop',
    async (request, reply) => {
      const catalog = resolveCatalog(catalogs, request.query.catalog, reply);
      if (!catalog) return reply;
      const theme = catalog.themeById.get(request.params.id);
      if (!theme) return await reply.code(404).send({
        error: { code: 'THEME_NOT_FOUND', message: 'テーマが見つかりません。' }
      });
      if (theme.integrationStatus === 'metadata-only') return rejectMetadataTheme(reply);
      return { data: { runtime: await runtimeManager.stop(theme) } };
    }
  );

  app.post<{ Params: ThemeParams; Querystring: CatalogQuery }>(
    '/api/themes/:id/recheck',
    async (request, reply) => {
      const catalog = resolveCatalog(catalogs, request.query.catalog, reply);
      if (!catalog) return reply;
      const theme = catalog.themeById.get(request.params.id);
      if (!theme) return await reply.code(404).send({
        error: { code: 'THEME_NOT_FOUND', message: 'テーマが見つかりません。' }
      });
      return { data: { runtime: await runtimeManager.recheck(theme) } };
    }
  );

  app.post<{ Params: ThemeParams; Querystring: CatalogQuery; Body: RunBody }>(
    '/api/themes/:id/run',
    async (request, reply) => {
      const catalog = resolveCatalog(catalogs, request.query.catalog, reply);
      if (!catalog) return reply;
      const theme = catalog.themeById.get(request.params.id);
      if (!theme) return await reply.code(404).send({
        error: { code: 'THEME_NOT_FOUND', message: 'テーマが見つかりません。' }
      });
      if (theme.integrationStatus === 'metadata-only') return rejectMetadataTheme(reply);
      const input = request.body?.input ?? '';
      if (typeof input !== 'string') {
        return await reply.code(400).send({
          error: { code: 'INVALID_INPUT', message: '入力は文字列で指定してください。' }
        });
      }
      const operationId = request.body?.operationId;
      if (operationId !== undefined && typeof operationId !== 'string') {
        return await reply.code(400).send({
          error: { code: 'INVALID_OPERATION', message: 'API操作の指定が不正です。' }
        });
      }
      const values = request.body?.values ?? {};
      if (!isRunValues(values)) {
        return await reply.code(400).send({
          error: { code: 'INVALID_INPUT_VALUES', message: 'API操作の入力値が不正です。' }
        });
      }
      try {
        return { data: { result: await runtimeManager.run(theme, input, operationId, values) } };
      } catch (error) {
        return await reply.code(400).send({
          error: {
            code: 'RUN_FAILED',
            message: error instanceof Error ? error.message : '実行に失敗しました。'
          }
        });
      }
    }
  );

  app.get<{ Params: ThemeParams; Querystring: CatalogQuery }>(
    '/api/themes/:id/logs',
    async (request, reply) => {
      const catalog = resolveCatalog(catalogs, request.query.catalog, reply);
      if (!catalog) return reply;
      const theme = catalog.themeById.get(request.params.id);
      if (!theme) return await reply.code(404).send({
        error: { code: 'THEME_NOT_FOUND', message: 'テーマが見つかりません。' }
      });
      if (theme.integrationStatus === 'metadata-only') return rejectMetadataTheme(reply);

      reply.hijack();
      reply.raw.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache',
        connection: 'keep-alive'
      });
      const send = (entry: LogEntry) => {
        reply.raw.write(`event: log\ndata: ${JSON.stringify(entry)}\n\n`);
      };
      for (const entry of runtimeManager.entries(theme.id)) send(entry);

      const listener = (themeId: string, entry: LogEntry) => {
        if (themeId === theme.id) send(entry);
      };
      runtimeManager.onLog(listener);
      request.raw.once('close', () => runtimeManager.offLog(listener));
    }
  );
}
