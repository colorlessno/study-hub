"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const { after, before, test } = require("node:test");
const { createServer, verify } = require("../app/server");

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

function request({ method = "GET", path, body, authorization }) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? "" : JSON.stringify(body);
    const headers = {};
    if (payload) headers["Content-Type"] = "application/json";
    if (authorization) headers.Authorization = authorization;
    const req = http.request({ host: "127.0.0.1", port, method, path, headers }, (res) => {
      let responseBody = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        responseBody += chunk;
      });
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(responseBody) }));
    });
    req.on("error", reject);
    req.end(payload);
  });
}

test("valid credentials issue a verifiable JWT", async () => {
  const response = await request({
    method: "POST",
    path: "/token",
    body: { userId: "u-demo", password: "passw0rd" },
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.token.split(".").length, 3);
  assert.equal(verify(response.body.token).sub, "u-demo");
});

test("invalid credentials do not issue a JWT", async () => {
  assert.deepEqual(
    await request({
      method: "POST",
      path: "/token",
      body: { userId: "u-demo", password: "wrong-password" },
    }),
    { status: 401, body: { error: "invalid_credentials" } },
  );
});

test("missing, tampered, and expired JWTs are rejected", async () => {
  assert.equal((await request({ path: "/profile" })).status, 401);
  assert.deepEqual(await request({ path: "/demo/tampered" }), {
    status: 401,
    body: { error: "signature" },
  });
  assert.deepEqual(await request({ path: "/demo/expired" }), {
    status: 401,
    body: { error: "expired" },
  });
});
