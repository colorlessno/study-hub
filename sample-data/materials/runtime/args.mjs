export function readOption(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

export function readPort(fallback) {
  const value = Number(readOption('port', String(fallback)));
  if (!Number.isInteger(value) || value < 1024 || value > 65535) {
    throw new Error('ポート番号が不正です。');
  }
  return value;
}

export function sendJson(response, statusCode, value, extraHeaders = {}) {
  const body = JSON.stringify(value);
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    ...extraHeaders
  });
  response.end(body);
}

export function stopOnSignal(server) {
  const stop = () => server.close(() => process.exit(0));
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
