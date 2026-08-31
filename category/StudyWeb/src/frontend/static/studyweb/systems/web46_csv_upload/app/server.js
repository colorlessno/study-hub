const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const appDirectory = __dirname;
const port = Number(process.env.PORT || 43346);
const maxFileBytes = 512 * 1024;
const maxRequestBytes = maxFileBytes + 64 * 1024;

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

async function serveFile(response, relativePath, contentType) {
  const body = await readFile(path.join(appDirectory, relativePath));
  response.writeHead(200, { 'Content-Type': contentType });
  response.end(body);
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxRequestBytes) throw Object.assign(new Error('送信データが上限を超えています。'), { statusCode: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function extractUploadedFile(body, contentType) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) throw new Error('multipart/form-dataのboundaryがありません。');
  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  let cursor = 0;
  while ((cursor = body.indexOf(boundary, cursor)) !== -1) {
    const headerStart = cursor + boundary.length + 2;
    const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), headerStart);
    if (headerEnd === -1) break;
    const headers = body.subarray(headerStart, headerEnd).toString('utf8');
    const fieldName = headers.match(/(?:^|;\s*)name="([^"]+)"/im)?.[1];
    const filename = headers.match(/(?:^|;\s*)filename="([^"]*)"/im)?.[1];
    const nextBoundary = body.indexOf(boundary, headerEnd + 4);
    if (nextBoundary === -1) break;
    if (fieldName === 'file') {
      const fileBody = body.subarray(headerEnd + 4, Math.max(headerEnd + 4, nextBoundary - 2));
      return { filename: path.basename(filename || ''), body: fileBody };
    }
    cursor = nextBoundary;
  }
  throw new Error('file項目がありません。');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value);
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }
  if (quoted) throw new Error('引用符が閉じられていません。');
  row.push(value);
  if (row.some((cell) => cell !== '')) rows.push(row);
  return rows;
}

function validateCsv(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return { preview: [], successCount: 0, failedCount: 0, errors: ['CSVの内容が空です。'] };
  const header = rows.shift().map((column) => column.trim());
  const required = ['code', 'name', 'price'];
  const errors = [];
  for (const column of required) {
    if (!header.includes(column)) errors.push(`1行目: 必須列 ${column} がありません。`);
  }
  const items = rows.map((values, index) => {
    const item = Object.fromEntries(header.map((column, valueIndex) => [column, values[valueIndex]?.trim() ?? '']));
    const rowErrors = [];
    if (values.length !== header.length) rowErrors.push('列数が見出しと一致しません。');
    if (!item.code) rowErrors.push('codeは必須です。');
    if (!item.name) rowErrors.push('nameは必須です。');
    if (!item.price || !Number.isFinite(Number(item.price))) rowErrors.push('priceは数値で入力してください。');
    for (const message of rowErrors) errors.push(`${index + 2}行目: ${message}`);
    return { item, valid: rowErrors.length === 0 };
  });
  return {
    preview: items.slice(0, 3).map(({ item }) => item),
    successCount: items.filter(({ valid }) => valid).length,
    failedCount: items.filter(({ valid }) => !valid).length,
    errors,
  };
}

function createAppServer() {
  return createServer(async (request, response) => {
    try {
      if (request.method === 'GET' && request.url === '/') return await serveFile(response, 'index.html', 'text/html; charset=utf-8');
      if (request.method === 'GET' && request.url === '/src/main.js') return await serveFile(response, 'src/main.js', 'text/javascript; charset=utf-8');
      if (request.method === 'GET' && request.url === '/api/health') return sendJson(response, 200, { ok: true });
      if (request.method === 'POST' && request.url === '/api/csv/validate') {
        const uploaded = extractUploadedFile(await readBody(request), request.headers['content-type'] || '');
        if (!uploaded.filename.toLowerCase().endsWith('.csv')) return sendJson(response, 400, { message: '拡張子が.csvのファイルを選択してください。' });
        if (uploaded.body.length > maxFileBytes) return sendJson(response, 413, { message: 'CSVファイルは512KiB以下にしてください。' });
        let text;
        try {
          text = new TextDecoder('utf-8', { fatal: true }).decode(uploaded.body);
        } catch {
          return sendJson(response, 400, { message: 'CSVファイルをUTF-8で保存してください。' });
        }
        return sendJson(response, 200, { filename: uploaded.filename, size: uploaded.body.length, ...validateCsv(text.replace(/^\uFEFF/, '')) });
      }
      sendJson(response, 404, { message: '指定したURLはありません。' });
    } catch (error) {
      sendJson(response, error?.statusCode || 400, { message: error instanceof Error ? error.message : '要求を処理できません。' });
    }
  });
}

if (require.main === module) {
  createAppServer().listen(port, '127.0.0.1', () => {
    console.log(`web46 server listening at http://127.0.0.1:${port}`);
  });
}

module.exports = { createAppServer };
