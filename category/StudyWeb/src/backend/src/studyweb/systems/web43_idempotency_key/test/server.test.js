"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const { after, before, test } = require("node:test");
const { createServer } = require("../api/src/server");

let server;
let port;

before(async () => {
  server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  port = server.address().port;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

function request({ path = "/orders", key, rawBody = "{}" }) {
  return new Promise((resolve, reject) => {
    const headers = { "Content-Type": "application/json" };
    if (key) headers["Idempotency-Key"] = key;
    const req = http.request({ host: "127.0.0.1", port, path, method: "POST", headers }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.on("error", reject);
    req.end(rawBody);
  });
}

test("missing idempotency key is rejected", async () => {
  assert.deepEqual(await request({}), {
    status: 400,
    body: { error: "idempotency_key_required" },
  });
});

test("invalid JSON returns a stable 400 response", async () => {
  assert.deepEqual(await request({ key: "bad-json", rawBody: "{" }), {
    status: 400,
    body: { error: "invalid_json" },
  });
});

test("first request is created and an identical replay reuses its result", async () => {
  const first = await request({ key: "order-001", rawBody: '{"name":"Sample"}' });
  assert.equal(first.status, 201);
  assert.equal(first.body.replay, false);
  assert.equal(first.body.count, 1);

  const replay = await request({ key: "order-001", rawBody: '{"name":"Sample"}' });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.replay, true);
  assert.equal(replay.body.result.id, first.body.result.id);
  assert.equal(replay.body.count, 1);
});

test("same key with a different payload is rejected", async () => {
  const response = await request({ key: "order-001", rawBody: '{"name":"Changed"}' });
  assert.deepEqual(response, {
    status: 409,
    body: { error: "idempotency_key_payload_conflict" },
  });
});

test("a new key creates a second result", async () => {
  const response = await request({ key: "order-002", rawBody: '{"name":"Sample"}' });
  assert.equal(response.status, 201);
  assert.equal(response.body.result.id, 2);
  assert.equal(response.body.count, 2);
});

test("unknown route returns 404", async () => {
  assert.deepEqual(await request({ path: "/unknown", key: "unknown" }), {
    status: 404,
    body: { error: "not_found" },
  });
});
