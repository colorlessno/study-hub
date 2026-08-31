const fs = require("fs");
const http = require("http");
const path = require("path");

const routes = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/app.js": { file: "app.js", type: "text/javascript; charset=utf-8" },
};

http.createServer((req, res) => {
  const route = routes[req.url];
  if (!route) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("not found");
  }
  fs.readFile(path.join(__dirname, "..", "public", route.file), (error, content) => {
    if (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("read error");
    }
    res.writeHead(200, { "Content-Type": route.type });
    res.end(content);
  });
}).listen(4108, "127.0.0.1", () => console.log("security08 listening on http://127.0.0.1:4108"));
