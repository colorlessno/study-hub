const http = require("http");
const { sign } = require("./signature");
const { ACCEPTANCE_WINDOW_MS, validateWebhook } = require("./webhook");
const port = Number(process.env.PORT || 4111);
const MAX_BODY_BYTES = 64 * 1024;

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function bodySizeResult(bodyBytes) {
  return bodyBytes > MAX_BODY_BYTES
    ? { status: 413, error: "body_too_large", limitBytes: MAX_BODY_BYTES, observedBytes: bodyBytes }
    : { status: 200, ok: true, limitBytes: MAX_BODY_BYTES, observedBytes: bodyBytes };
}

function demoValidation(kind, seen) {
  const now = Date.now();
  const timestamp = kind === "expired" ? now - ACCEPTANCE_WINDOW_MS - 1 : now;
  const eventId = kind === "missing-event-id" ? "" : `demo-${kind}-${now}`;
  const body = Buffer.from(JSON.stringify({ event: "order.created" }));
  const signedBody = kind === "tampered"
    ? Buffer.from(JSON.stringify({ event: "order.changed" }))
    : body;
  const signature = sign(timestamp, signedBody);
  return validateWebhook({ timestamp, body, signature, eventId }, { now, seen });
}

function runDemo(kind, seen) {
  if (kind === "replay") {
    const now = Date.now();
    const eventId = `demo-replay-${now}`;
    const body = Buffer.from(JSON.stringify({ event: "order.created" }));
    const signature = sign(now, body);
    const request = { timestamp: now, body, signature, eventId };
    return {
      case: kind,
      first: validateWebhook(request, { now, seen }),
      second: validateWebhook(request, { now, seen }),
    };
  }
  return { case: kind, result: demoValidation(kind, seen) };
}

function createServer() {
  const seen = new Set();

  return http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      return send(res, 200, { ok: true });
    }

    if (req.method === "POST" && req.url === "/demo/body-too-large") {
      const result = bodySizeResult(MAX_BODY_BYTES + 1);
      return send(res, result.status, result);
    }

    const demoMatch = req.method === "POST" && req.url.match(/^\/demo\/(valid|tampered|expired|missing-event-id|replay)$/);
    if (demoMatch) {
      return send(res, 200, runDemo(demoMatch[1], seen));
    }

    if (req.method === "POST" && req.url === "/webhook") {
      const chunks = [];
      let bodyBytes = 0;
      req.on("data", (chunk) => {
        bodyBytes += chunk.length;
        if (bodyBytes <= MAX_BODY_BYTES) chunks.push(chunk);
      });
      req.on("end", () => {
        const sizeResult = bodySizeResult(bodyBytes);
        if (sizeResult.status === 413) return send(res, sizeResult.status, sizeResult);

        const result = validateWebhook({
          timestamp: req.headers["x-timestamp"],
          body: Buffer.concat(chunks),
          signature: req.headers["x-signature"],
          eventId: req.headers["x-event-id"],
        }, { seen });
        return send(res, result.status, result);
      });
      return;
    }

    return send(res, 404, { error: "not_found" });
  });
}

if (require.main === module) {
  createServer().listen(port, "127.0.0.1", () => console.log(`security11 listening on http://127.0.0.1:${port}`));
}

module.exports = { MAX_BODY_BYTES, bodySizeResult, createServer };
