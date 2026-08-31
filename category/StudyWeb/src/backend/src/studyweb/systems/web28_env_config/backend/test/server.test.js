"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const { after, before, test } = require("node:test");
const { createServer, readConfig } = require("../server");

let server;
let port;

before(async () => {
  server = createServer({ port: 13028, databaseUrl: "postgres://private", message: "study" });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  port = server.address().port;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

function request(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: "127.0.0.1", port, path }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) }));
    }).on("error", reject);
  });
}

test("required environment variables are validated together", () => {
  assert.throws(
    () => readConfig({ PORT: "13028" }),
    /Missing required env: DATABASE_URL, APP_MESSAGE/,
  );
});

test("port must be an integer in the TCP range", () => {
  for (const value of ["abc", "0", "65536", "1.5"]) {
    assert.throws(
      () => readConfig({ PORT: value, DATABASE_URL: "private", APP_MESSAGE: "study" }),
      /Invalid PORT/,
    );
  }
});

test("valid environment is converted to a server config", () => {
  assert.deepEqual(
    readConfig({ PORT: "13028", DATABASE_URL: "postgres://private", APP_MESSAGE: "study" }),
    { port: 13028, databaseUrl: "postgres://private", message: "study" },
  );
});

test("health endpoint responds without exposing config", async () => {
  const response = await request("/health");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: "ok" });
  assert.equal(response.headers["access-control-allow-origin"], "*");
});

test("config check exposes presence but not the database URL", async () => {
  const response = await request("/config-check");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "ok",
    apiPort: 13028,
    hasDatabaseUrl: true,
    message: "study",
  });
  assert.equal(JSON.stringify(response.body).includes("postgres://private"), false);
});

test("unknown route returns 404", async () => {
  const response = await request("/unknown");
  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { error: "not_found" });
});
