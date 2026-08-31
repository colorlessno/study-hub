"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const { after, before, test } = require("node:test");
const { authorize, createServer } = require("../app/server");

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

function request({ method = "GET", path, user }) {
  return new Promise((resolve, reject) => {
    const headers = user ? { "X-User": user } : {};
    const req = http.request({ host: "127.0.0.1", port, method, path, headers }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.on("error", reject);
    req.end();
  });
}

function requestText(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

test("permission table denies unknown actions", () => {
  assert.equal(authorize("admin", "orders:unknown"), false);
});

test("demo UI explains that API authorization is still required", async () => {
  const response = await requestText("/demo");
  assert.equal(response.status, 200);
  assert.match(response.body, /RBACのUI表示制御とAPI認可/);
  assert.match(response.body, /APIへ取消要求を直接送信/);
});

test("missing user is unauthenticated", async () => {
  assert.deepEqual(await request({ path: "/orders" }), {
    status: 401,
    body: { error: "unauthenticated" },
  });
});

test("viewer can read orders", async () => {
  const response = await request({ path: "/orders", user: "v-viewer" });
  assert.equal(response.status, 200);
  assert.equal(response.body.user.role, "viewer");
  assert.equal(response.body.orders[0].id, "o-100");
});

test("viewer cannot cancel an order", async () => {
  assert.deepEqual(
    await request({ method: "POST", path: "/orders/o-100/cancel", user: "v-viewer" }),
    { status: 403, body: { error: "forbidden" } },
  );
});

test("operator can cancel an order", async () => {
  const response = await request({
    method: "POST",
    path: "/orders/o-100/cancel",
    user: "o-operator",
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "canceled");
});

test("authenticated user receives not found for an unknown route", async () => {
  assert.deepEqual(await request({ path: "/unknown", user: "a-admin" }), {
    status: 404,
    body: { error: "not_found" },
  });
});
