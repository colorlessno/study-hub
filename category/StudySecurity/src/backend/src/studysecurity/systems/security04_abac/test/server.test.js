"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const { after, before, test } = require("node:test");
const { createServer } = require("../app/server");

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

function request({ method = "GET", path, user, body }) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? "" : JSON.stringify(body);
    const headers = {};
    if (user) headers["X-User"] = user;
    if (payload) headers["Content-Type"] = "application/json";
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

test("authentication, missing resource, and department mismatch use different status codes", async () => {
  assert.equal((await request({ path: "/orders/o-200" })).status, 401);
  assert.equal((await request({ path: "/orders/o-999", user: "alice" })).status, 404);
  assert.equal((await request({ path: "/orders/o-200", user: "bob" })).status, 403);
});

test("department match allows reading an order", async () => {
  const response = await request({ path: "/orders/o-200", user: "alice" });
  assert.equal(response.status, 200);
  assert.equal(response.body.department, "sales");
  assert.equal(response.body.status, "draft");
});

test("an authorized update is saved and can be read again", async () => {
  const update = await request({
    method: "PATCH",
    path: "/orders/o-200",
    user: "alice",
    body: { note: "StudyHubで更新", department: "support", status: "confirmed" },
  });
  assert.equal(update.status, 200);
  assert.equal(update.body.note, "StudyHubで更新");
  assert.equal(update.body.updatedBy, "alice");
  assert.equal(update.body.department, "sales");
  assert.equal(update.body.status, "draft");

  const saved = await request({ path: "/orders/o-200", user: "alice" });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.note, "StudyHubで更新");
  assert.equal(saved.body.updatedBy, "alice");
});

test("a confirmed order cannot be updated even by the same department", async () => {
  assert.deepEqual(
    await request({
      method: "PATCH",
      path: "/orders/o-201",
      user: "bob",
      body: { note: "更新不可" },
    }),
    { status: 403, body: { error: "forbidden" } },
  );
});
