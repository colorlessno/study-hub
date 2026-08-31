"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const { createServer } = require("../app/server");

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

function request(port, { method = "GET", path = "/", headers = {}, body = "" } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, method, path, headers }, (res) => {
      let responseBody = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { responseBody += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: responseBody }));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

test("demo page exposes the safe attack-style comparison", async () => {
  const server = createServer();
  const port = await listen(server);
  try {
    const response = await request(port, { path: "/demo" });
    assert.equal(response.status, 200);
    assert.match(response.body, /攻撃ページ風にtokenなしで送信/);
    assert.match(response.body, /SameSiteは補助対策/);
  } finally {
    await close(server);
  }
});

test("cookie and one-time token are required for the state change", async () => {
  const server = createServer();
  const port = await listen(server);
  try {
    const withoutSession = await request(port, {
      method: "POST",
      path: "/transfer",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csrf: "not-issued" }),
    });
    assert.equal(withoutSession.status, 401);

    const issued = await request(port, { path: "/token" });
    const cookie = issued.headers["set-cookie"][0].split(";", 1)[0];
    const token = JSON.parse(issued.body).token;

    const withoutToken = await request(port, {
      method: "POST",
      path: "/transfer",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: "{}",
    });
    assert.equal(withoutToken.status, 403);

    const valid = await request(port, {
      method: "POST",
      path: "/transfer",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ csrf: token }),
    });
    assert.equal(valid.status, 200);
    assert.equal(JSON.parse(valid.body).balance, 999);

    const replay = await request(port, {
      method: "POST",
      path: "/transfer",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ csrf: token }),
    });
    assert.equal(replay.status, 403);
  } finally {
    await close(server);
  }
});
