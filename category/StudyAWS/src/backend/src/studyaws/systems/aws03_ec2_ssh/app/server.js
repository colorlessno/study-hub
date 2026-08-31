const http = require("http");
const port = Number(process.env.PORT || 4103);
http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, pid: process.pid, port }));
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
}).listen(port, () => console.log(`aws03 server listening on ${port}`));
