import fs from 'node:fs';
import path from 'node:path';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { loadCatalogs, repositoryRoot, sampleDataRoot } from './catalog/loader.js';
import { RuntimeManager } from './runtime/manager.js';
import { registerApi } from './routes/api.js';

const app = Fastify({ logger: true });
const catalogs = loadCatalogs();
const runtimeManager = new RuntimeManager(sampleDataRoot, repositoryRoot);

await app.register(fastifyStatic, {
  root: sampleDataRoot,
  prefix: '/sample-materials/',
  decorateReply: false
});
await registerApi(app, catalogs, runtimeManager);

app.get('/api/health', async () => ({
  data: { status: 'ready', catalogs: ['sample', 'actual'] }
}));
const frontendRoot = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(frontendRoot)) {
  await app.register(fastifyStatic, {
    root: frontendRoot,
    prefix: '/',
    wildcard: false
  });
  app.setNotFoundHandler(async (request, reply) => {
    if (request.method === 'GET' && request.headers.accept?.includes('text/html')) {
      return await reply.type('text/html; charset=utf-8').sendFile('index.html');
    }
    return await reply.code(404).send({
      error: { code: 'NOT_FOUND', message: '指定された情報が見つかりません。' }
    });
  });
}
app.addHook('onClose', async () => runtimeManager.stopAll());

let shuttingDown = false;
async function shutdown(signal: 'SIGINT' | 'SIGTERM'): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info(`${signal}を受信したため、実行中のテーマを停止します。`);
  try {
    await app.close();
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ host: '127.0.0.1', port: 3100 });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
