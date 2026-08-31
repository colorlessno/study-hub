"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const { sign, verify } = require("../app/signature");
const { ACCEPTANCE_WINDOW_MS, validateWebhook } = require("../app/webhook");
const { MAX_BODY_BYTES, createServer } = require("../app/server");

const NOW = 1_800_000_000_000;
const BODY = JSON.stringify({ event: "order.created" });

function signedInput(overrides = {}) {
  const timestamp = overrides.timestamp ?? NOW;
  const body = overrides.body ?? BODY;
  return {
    timestamp,
    body,
    signature: overrides.signature ?? sign(timestamp, body),
    eventId: overrides.eventId ?? "evt-001",
  };
}

test("signature is bound to timestamp and raw body", () => {
  const signature = sign(NOW, BODY);
  assert.equal(verify(NOW, BODY, signature), true);
  assert.equal(verify(NOW, `${BODY} `, signature), false);
  assert.equal(verify(NOW + 1, BODY, signature), false);
});

test("valid event is accepted and recorded", () => {
  const seen = new Set();
  assert.deepEqual(validateWebhook(signedInput(), { now: NOW, seen }), { status: 200, ok: true });
  assert.equal(seen.has("evt-001"), true);
});

test("timestamp at five minutes is accepted and one millisecond beyond is rejected", () => {
  const boundary = NOW - ACCEPTANCE_WINDOW_MS;
  assert.equal(validateWebhook(signedInput({ timestamp: boundary }), { now: NOW }).status, 200);

  const expired = boundary - 1;
  assert.deepEqual(validateWebhook(signedInput({ timestamp: expired }), { now: NOW }), {
    status: 401,
    error: "timestamp",
  });
});

test("missing event ID is rejected before replay storage", () => {
  const seen = new Set();
  assert.deepEqual(validateWebhook(signedInput({ eventId: " " }), { now: NOW, seen }), {
    status: 400,
    error: "event_id",
  });
  assert.equal(seen.size, 0);
});

test("invalid signature is rejected", () => {
  assert.deepEqual(validateWebhook(signedInput({ signature: "invalid" }), { now: NOW }), {
    status: 401,
    error: "signature",
  });
});

test("a repeated event ID is rejected as replay", () => {
  const seen = new Set(["evt-001"]);
  assert.deepEqual(validateWebhook(signedInput(), { now: NOW, seen }), {
    status: 409,
    error: "replay",
  });
});

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

function post(port, path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: "127.0.0.1",
      port,
      method: "POST",
      path,
      headers: { "Content-Type": "application/octet-stream", "Content-Length": Buffer.byteLength(body) },
    }, (res) => {
      let responseBody = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { responseBody += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(responseBody) }));
    });
    req.on("error", reject);
    req.end(body);
  });
}

test("POST /webhook rejects a body larger than 64 KiB", async () => {
  const server = createServer();
  const port = await listen(server);
  try {
    const response = await post(port, "/webhook", "x".repeat(MAX_BODY_BYTES + 1));
    assert.equal(response.status, 413);
    assert.deepEqual(response.body, {
      status: 413,
      error: "body_too_large",
      limitBytes: MAX_BODY_BYTES,
      observedBytes: MAX_BODY_BYTES + 1,
    });
  } finally {
    await close(server);
  }
});
