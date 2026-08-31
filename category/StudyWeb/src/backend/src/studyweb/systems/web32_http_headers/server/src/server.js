const http = require('http');
const port = Number(process.env.PORT || 3032);

function json(res, status, body, requestId) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'X-Study-Request-Id': requestId,
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
  });
}

const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>web32 HTTPヘッダーの観察</title>
<style>body{font-family:sans-serif;line-height:1.6;max-width:760px;margin:32px auto;padding:0 16px}button,input{font:inherit;padding:8px 12px}label{display:block;margin:16px 0}button{margin:0 8px 8px 0}pre{background:#f3f3f3;border:1px solid #bbb;padding:16px;white-space:pre-wrap}</style></head><body>
<main><h1>HTTPヘッダーの観察</h1>
<p>GETとPOSTを実行し、送信内容と応答の状態番号・ヘッダー・本文を比較します。</p>
<label>POSTで送るメッセージ <input id="message" value="hello"></label>
<button id="get">GET /api/hello</button><button id="post">POST /api/echo</button>
<pre id="out">ボタンを押すと要求と応答が表示されます。</pre></main>
<script src="/client/src/main.js"></script></body></html>`;

http.createServer(async (req, res) => {
  const requestId = `req_${Date.now()}`;
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }
  if (req.url === '/client/src/main.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    return res.end(`const out = document.querySelector('#out');
const message = document.querySelector('#message');
async function callApi(method, url, headers = {}, body) {
  const response = await fetch(url, { method, headers, body });
  const responseText = await response.text();
  let responseBody = responseText;
  try { responseBody = JSON.parse(responseText); } catch {}
  out.textContent = JSON.stringify({
    request: { method, url, headers, body: body ? JSON.parse(body) : null },
    response: {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
    },
  }, null, 2);
}
document.querySelector('#get').onclick = () => callApi('GET', '/api/hello', { 'X-Client': 'browser' });
document.querySelector('#post').onclick = () => callApi('POST', '/api/echo', { 'Content-Type': 'application/json' }, JSON.stringify({ message: message.value }));`);
  }
  if (req.method === 'GET' && req.url === '/api/hello') {
    return json(res, 200, { method: req.method, headers: req.headers }, requestId);
  }
  if (req.method === 'POST' && req.url === '/api/echo') {
    const body = await readBody(req);
    return json(res, 200, { method: req.method, headers: req.headers, body }, requestId);
  }
  return json(res, 404, { error: 'not_found' }, requestId);
}).listen(port, '127.0.0.1', () => console.log(`web32 http://127.0.0.1:${port}`));
