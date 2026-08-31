const http = require("http");
const crypto = require("crypto");
const port = Number(process.env.PORT || 4106);

function log(level, requestId, message, extra = {}) {
  console.log(JSON.stringify({ at: new Date().toISOString(), level, requestId, message, ...extra }));
}

http.createServer((req, res) => {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  const requestUrl = new URL(req.url, `http://127.0.0.1:${port}`);
  const requestPath = requestUrl.pathname;
  log("info", requestId, "request started", { event: "request.started", path: requestPath });
  if (requestPath === "/error") {
    log("error", requestId, "simulated error", {
      event: "request.failed",
      path: requestPath,
      statusCode: 500,
    });
    res.writeHead(500, { "Content-Type": "application/json", "x-request-id": requestId });
    return res.end(JSON.stringify({ error: "simulated", requestId }));
  }
  if (requestPath === "/sensitive") {
    log("info", requestId, "sensitive request received", {
      event: "request.completed",
      path: requestPath,
      statusCode: 200,
      sensitiveValuesLogged: false,
    });
    res.writeHead(200, { "Content-Type": "application/json", "x-request-id": requestId });
    return res.end(JSON.stringify({ ok: true, requestId, recordedPath: requestPath, sensitiveValuesLogged: false }));
  }
  log("info", requestId, "request completed", {
    event: "request.completed",
    path: requestPath,
    statusCode: 200,
  });
  res.writeHead(200, { "Content-Type": "application/json", "x-request-id": requestId });
  res.end(JSON.stringify({ ok: true, requestId, path: requestPath }));
}).listen(port, "127.0.0.1", () => console.log(`aws06 logs server listening on 127.0.0.1:${port}`));
