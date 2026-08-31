"use strict";

const { randomUUID } = require("node:crypto");
const http = require("node:http");
const port = Number(process.env.PORT || 3033);

function parseCookie(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .filter(Boolean)
      .map((value) => {
        const [key, ...rest] = value.trim().split("=");
        return [key, rest.join("=")];
      }),
  );
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>web33 Cookieとセッション</title>
<style>body{font-family:sans-serif;line-height:1.6;max-width:760px;margin:32px auto;padding:0 16px}button{font:inherit;padding:8px 12px;margin:0 8px 8px 0}pre{background:#f3f3f3;border:1px solid #bbb;padding:16px;white-space:pre-wrap}</style></head><body>
<main><h1>Cookieとセッション</h1>
<p>ログイン、ログイン状態の確認、ログアウトを順に実行します。Cookieの属性はブラウザ開発者ツールのApplication（保存領域）で確認します。</p>
<button id="login">ログイン</button><button id="me">ログイン状態を確認</button><button id="logout">ログアウト</button>
<pre id="out">操作するとHTTP状態番号と応答本文が表示されます。</pre></main>
<script>
const out=document.querySelector('#out');
async function call(path,method='GET'){const r=await fetch(path,{method,credentials:'include'});out.textContent='HTTP '+r.status+'\n'+await r.text();}
login.onclick=()=>call('/login','POST'); me.onclick=()=>call('/me'); logout.onclick=()=>call('/logout','POST');
</script></body></html>`;

function createServer({ sessions = new Map(), createSessionId = () => `sid_${randomUUID()}` } = {}) {
  return http.createServer((req, res) => {
    if (req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(html);
    }
    if (req.method === "POST" && req.url === "/login") {
      const sid = createSessionId();
      sessions.set(sid, { userId: "user01", name: "Study User" });
      return send(res, 200, { ok: true }, {
        "Set-Cookie": `sid=${sid}; HttpOnly; SameSite=Lax; Path=/`,
      });
    }
    if (req.method === "GET" && req.url === "/me") {
      const sid = parseCookie(req.headers.cookie).sid;
      const session = sessions.get(sid);
      return session
        ? send(res, 200, { user: session })
        : send(res, 401, { error: "not_logged_in" });
    }
    if (req.method === "POST" && req.url === "/logout") {
      const sid = parseCookie(req.headers.cookie).sid;
      sessions.delete(sid);
      return send(res, 200, { ok: true }, {
        "Set-Cookie": "sid=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/",
      });
    }
    return send(res, 404, { error: "not_found" });
  });
}

if (require.main === module) {
  createServer().listen(port, "127.0.0.1", () => console.log(`web33 http://127.0.0.1:${port}`));
}

module.exports = { createServer, parseCookie };
