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

function request({ method = "GET", path, body }) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const headers = payload === undefined ? {} : {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    };
    const req = http.request({ host: "127.0.0.1", port, method, path, headers }, (res) => {
      let responseBody = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { responseBody += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(responseBody) }));
    });
    req.on("error", reject);
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

test("status responses follow actual input and stored item state", async () => {
  const initial = await request({ path: "/items" });
  assert.equal(initial.status, 200);
  assert.deepEqual(initial.body.items, [{ id: 1, name: "one" }]);

  const created = await request({ method: "POST", path: "/items", body: { name: "two" } });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body, { id: 2, name: "two" });

  const stored = await request({ path: "/items" });
  assert.deepEqual(stored.body.items, [{ id: 1, name: "one" }, { id: 2, name: "two" }]);

  const invalid = await request({ method: "POST", path: "/items", body: {} });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, "VALIDATION_ERROR");

  const conflict = await request({ method: "POST", path: "/items", body: { name: "two" } });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.error.code, "CONFLICT");
});

test("authentication, permission, absence, and internal errors use the common form", async () => {
  const cases = [
    ["/private", 401, "UNAUTHORIZED"],
    ["/admin", 403, "FORBIDDEN"],
    ["/items/999", 404, "NOT_FOUND"],
    ["/error", 500, "INTERNAL_ERROR"],
  ];

  for (const [path, status, code] of cases) {
    const response = await request({ path });
    assert.equal(response.status, status);
    assert.equal(response.body.error.code, code);
    assert.equal(typeof response.body.error.message, "string");
    assert.equal(JSON.stringify(response.body).includes("intentional internal failure"), false);
  }
});
