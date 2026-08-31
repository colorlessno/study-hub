const http = require("http");
const { createLimiter } = require("./rate_limiter");
const limit = createLimiter(3, 10000);
const port = Number(process.env.PORT || 4113);

function writeJson(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(JSON.stringify(body));
}

function limiterResult(result) {
  return {
    allowed: result.allowed,
    remaining: result.remaining,
    retryAfter: result.retryAfter,
  };
}

http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200); return res.end("ok");
  }

  if (req.url === "/demo/burst") {
    const demoLimit = createLimiter(3, 10000);
    const attempts = [0, 1, 2, 3].map((now) => limiterResult(demoLimit("user:burst", now)));
    return writeJson(res, 429, {
      scenario: "同じ利用者が時間窓内に4回要求",
      statuses: attempts.map((attempt) => attempt.allowed ? 200 : 429),
      attempts,
    }, { "Retry-After": String(attempts[3].retryAfter) });
  }

  if (req.url === "/demo/reset-window") {
    const demoLimit = createLimiter(3, 10000);
    const attempts = [0, 1, 2, 3, 10000]
      .map((now) => ({ now, ...limiterResult(demoLimit("user:reset", now)) }));
    return writeJson(res, 200, {
      scenario: "時間窓の境界で回数をリセット",
      statuses: attempts.map((attempt) => attempt.allowed ? 200 : 429),
      attempts,
    });
  }

  if (req.url === "/demo/key-isolation") {
    const demoLimit = createLimiter(3, 10000);
    const learnerA = [0, 1, 2].map((now) => limiterResult(demoLimit("user:learner-a", now)));
    const learnerB = [3].map((now) => limiterResult(demoLimit("user:learner-b", now)));
    return writeJson(res, 200, {
      scenario: "利用者ごとに回数を分離",
      learnerA,
      learnerB,
    });
  }

  const demoUser = String(req.headers["x-demo-user"] || "").trim();
  const key = demoUser ? `user:${demoUser}` : `ip:${req.socket.remoteAddress}`;
  const result = limit(key);
  const rateHeaders = {
    "RateLimit-Limit": "3",
    "RateLimit-Remaining": String(result.remaining),
    "Cache-Control": "no-store",
  };
  if (!result.allowed) {
    return writeJson(res, 429, { error: "rate_limited", key }, { ...rateHeaders, "Retry-After": String(result.retryAfter) });
  }
  writeJson(res, 200, { ok: true, key }, rateHeaders);
}).listen(port, "127.0.0.1", () => console.log(`security13 listening on http://127.0.0.1:${port}`));
