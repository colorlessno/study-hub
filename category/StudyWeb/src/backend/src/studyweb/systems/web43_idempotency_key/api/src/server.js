"use strict";

const { createHash } = require("node:crypto");
const http = require("node:http");
const port = Number(process.env.PORT || 3043);

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function read(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
  });
}

function hashPayload(body) {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

function createServer({ results = new Map(), created = [] } = {}) {
  return http.createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/orders") {
      return send(res, 404, { error: "not_found" });
    }

    const key = req.headers["idempotency-key"];
    if (typeof key !== "string" || key.trim() === "") {
      return send(res, 400, { error: "idempotency_key_required" });
    }

    let body;
    try {
      body = JSON.parse((await read(req)) || "{}");
    } catch {
      return send(res, 400, { error: "invalid_json" });
    }

    const payloadHash = hashPayload(body);
    if (results.has(key)) {
      const stored = results.get(key);
      if (stored.payloadHash !== payloadHash) {
        return send(res, 409, { error: "idempotency_key_payload_conflict" });
      }
      return send(res, 200, { replay: true, result: stored.result, count: created.length });
    }

    const result = { id: created.length + 1, name: body.name || "order" };
    created.push(result);
    results.set(key, { payloadHash, result });
    return send(res, 201, { replay: false, result, count: created.length });
  });
}

if (require.main === module) {
  createServer().listen(port, "127.0.0.1", () => console.log(`web43 http://127.0.0.1:${port}/orders`));
}

module.exports = { createServer, hashPayload };
