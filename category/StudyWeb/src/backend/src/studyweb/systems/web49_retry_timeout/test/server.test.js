"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const { after, before, test } = require("node:test");
const { createServer } = require("../api/src/server");

let server;
let port;
const scheduledDelays = [];

before(async () => {
  server = createServer({
    schedule: (callback, delay) => {
      scheduledDelays.push(delay);
      callback();
    },
  });
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

test("success returns 200 immediately", async () => {
  const response = await request("/?mode=success");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { mode: "success", message: "success" });
});

test("slow waits 2000 milliseconds before returning 200", async () => {
  const response = await request("/?mode=slow");
  assert.equal(response.status, 200);
  assert.equal(response.body.waitedMilliseconds, 2000);
  assert.deepEqual(scheduledDelays, [2000]);
});

test("temporary returns two 503 responses and then recovers", async () => {
  const first = await request("/?mode=temporary&key=test");
  const second = await request("/?mode=temporary&key=test");
  const third = await request("/?mode=temporary&key=test");

  assert.equal(first.status, 503);
  assert.equal(first.body.attempt, 1);
  assert.equal(first.headers["retry-after"], "1");
  assert.equal(second.status, 503);
  assert.deepEqual(third.body, { mode: "temporary", attempt: 3, recovered: true });

  const nextCycle = await request("/?mode=temporary&key=test");
  assert.equal(nextCycle.status, 503);
  assert.equal(nextCycle.body.attempt, 1);
});

test("permanent and unknown modes return 400", async () => {
  assert.deepEqual((await request("/?mode=permanent")).body, { mode: "permanent", retryable: false });
  assert.equal((await request("/?mode=unknown")).status, 400);
});
