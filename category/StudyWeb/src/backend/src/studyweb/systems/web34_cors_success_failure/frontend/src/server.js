const http = require('http');
const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>web34 CORSの成功と失敗</title>
<style>body{font-family:sans-serif;line-height:1.6;max-width:760px;margin:32px auto;padding:0 16px}button{display:block;font:inherit;padding:10px 14px;margin:12px 0}pre{background:#f3f3f3;border:1px solid #bbb;padding:16px;white-space:pre-wrap}</style></head><body>
<main><h1>CORSの成功と失敗</h1>
<p>同じPOST要求を、CORSを許可しないAPIと許可するAPIへ送り、ブラウザの結果を比較します。</p>
<button data-label="CORSを許可しないAPI" data-url="http://127.0.0.1:3035/api/message" data-credentials="omit">許可しないAPIへ送信</button>
<button data-label="CORSを許可するAPI（Cookieなし）" data-url="http://127.0.0.1:3036/api/message" data-credentials="omit">許可するAPIへ送信（Cookieなし）</button>
<button data-label="CORSを許可するAPI（Cookieあり）" data-url="http://127.0.0.1:3036/api/message" data-credentials="include">許可するAPIへ送信（Cookieあり）</button>
<pre id="out">どちらかのAPIを選んでください。</pre></main>
<script>
const out = document.querySelector('#out');
for (const button of document.querySelectorAll('button')) {
  button.onclick = async () => {
    try {
      const response = await fetch(button.dataset.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        credentials: button.dataset.credentials
      });
      out.textContent = button.dataset.label + '\\nHTTP ' + response.status + '\\n' + await response.text();
    } catch (error) {
      out.textContent = button.dataset.label + '\\nブラウザが応答の利用を拒否しました。\\n' + error.message;
    }
  };
}
</script></body></html>`;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}).listen(3034, '127.0.0.1', () => console.log('web34 frontend http://127.0.0.1:3034'));
