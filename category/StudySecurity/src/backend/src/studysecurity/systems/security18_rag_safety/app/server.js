const http = require("http");
const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "..", "public");
const files = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
]);

http.createServer((req, res) => {
  const entry = files.get(new URL(req.url, "http://localhost").pathname);
  if (!entry) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("not found");
  }
  res.writeHead(200, { "Content-Type": entry[1], "Cache-Control": "no-store" });
  fs.createReadStream(path.join(publicDir, entry[0])).pipe(res);
}).listen(4118, "127.0.0.1", () => console.log("security18 listening on http://127.0.0.1:4118"));
