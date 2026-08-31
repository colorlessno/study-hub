const http = require("http");
const port = Number(process.env.PORT || 4115);

const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none'; object-src 'none'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
  "Cache-Control": "no-store",
};

http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Cache-Control": "no-store" });
    return res.end("ok");
  }

  if (req.url === "/without-security-headers") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end("<!doctype html><meta charset='utf-8'><h1>比較用: 防御ヘッダーなし</h1>");
  }

  res.writeHead(200, headers);
  res.end("<!doctype html><meta charset='utf-8'><h1>防御ヘッダーあり</h1>");
}).listen(port, "127.0.0.1", () => console.log(`security15 listening on http://127.0.0.1:${port}`));
