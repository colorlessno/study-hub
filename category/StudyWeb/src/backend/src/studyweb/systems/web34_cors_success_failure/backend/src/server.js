const http = require('http');
const allowCors = process.env.ALLOW_CORS === '1';
const port = Number(process.env.PORT || 3035);
const allowedOrigin = 'http://127.0.0.1:3034';

function headers() {
  return allowCors ? {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  } : {};
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers());
    return res.end();
  }
  const cookieReceived = (req.headers.cookie || '').split(';').some((value) => value.trim() === 'web34_session=study');
  const responseHeaders = { 'Content-Type': 'application/json', ...headers() };
  if (allowCors && req.method === 'POST') {
    responseHeaders['Set-Cookie'] = 'web34_session=study; HttpOnly; SameSite=Lax; Path=/';
  }
  res.writeHead(200, responseHeaders);
  res.end(JSON.stringify({
    message: 'backend response',
    cors: allowCors,
    credentialsAllowed: allowCors,
    cookieReceived,
  }));
}).listen(port, '127.0.0.1', () => {
  console.log(`web34 backend http://127.0.0.1:${port} cors=${allowCors}`);
});
