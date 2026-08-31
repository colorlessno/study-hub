const http = require('http');
const port = Number(process.env.PORT || 3041);
function requestId() { return `req_${Date.now()}`; }
function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}
function error(code, message, details = []) {
  return { error: { code, message, details, requestId: requestId() } };
}
http.createServer((req, res) => {
  if (req.url === '/validation') return send(res, 400, error('VALIDATION_ERROR', '入力内容を確認してください', [{ field: 'name', message: '必須です' }]));
  if (req.url === '/business') return send(res, 409, error('ORDER_ALREADY_CLOSED', '完了済みの注文は変更できません'));
  if (req.url === '/system') return send(res, 500, error('INTERNAL_ERROR', '時間をおいて再実行してください'));
  return send(res, 200, { ok: true });
}).listen(port, '127.0.0.1', () => console.log(`web41 http://127.0.0.1:${port}`));
