"use strict";

const http = require("node:http");
const port = Number(process.env.PORT || 3049);

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
  res.end(JSON.stringify(body));
}

function createServer({ temporaryCounts = new Map(), schedule = setTimeout } = {}) {
  return http.createServer((req, res) => {
    const requestUrl = new URL(req.url, "http://localhost");
    if (req.method !== "GET" || requestUrl.pathname !== "/") {
      return send(res, 404, { error: "not_found" });
    }

    const mode = requestUrl.searchParams.get("mode") || "success";
    const key = requestUrl.searchParams.get("key") || "default";
    if (mode === "success") return send(res, 200, { mode, message: "success" });
    if (mode === "slow") {
      return schedule(() => send(res, 200, { mode, message: "slow_response", waitedMilliseconds: 2000 }), 2000);
    }
    if (mode === "temporary") {
      const totalAttempts = (temporaryCounts.get(key) || 0) + 1;
      const attempt = ((totalAttempts - 1) % 3) + 1;
      temporaryCounts.set(key, totalAttempts);
      if (attempt !== 3) {
        return send(res, 503, { mode, attempt, retryable: true }, { "Retry-After": "1" });
      }
      return send(res, 200, { mode, attempt, recovered: true });
    }
    if (mode === "permanent") return send(res, 400, { mode, retryable: false });
    return send(res, 400, { error: "unknown_mode", allowedModes: ["success", "slow", "temporary", "permanent"] });
  });
}

if (require.main === module) {
  createServer().listen(port, "127.0.0.1", () => console.log(`web49 http://127.0.0.1:${port}/?mode=success`));
}

module.exports = { createServer };
