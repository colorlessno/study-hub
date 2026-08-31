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

function request(path, method = "GET") {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path, method }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) }));
    });
    req.on("error", reject);
    req.end();
  });
}

test("default query returns the first ten of thirty items", async () => {
  const response = await request("/items");
  assert.equal(response.status, 200);
  assert.equal(response.body.items.length, 10);
  assert.deepEqual(response.body.meta, {
    total: 30,
    limit: 10,
    offset: 0,
    returned: 10,
    page: 1,
    totalPages: 3,
    hasPrevious: false,
    hasNext: true,
  });
});

test("filter, descending sort, and pagination are applied in order", async () => {
  const response = await request("/items?status=open&sort=createdAt&order=desc&limit=3&offset=1");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.meta, {
    total: 15,
    limit: 3,
    offset: 1,
    returned: 3,
    page: 1,
    totalPages: 5,
    hasPrevious: true,
    hasNext: true,
  });
  assert.deepEqual(response.body.items.map((item) => item.createdAt), [
    "2026-04-26",
    "2026-04-24",
    "2026-04-22",
  ]);
});

test("the last page reports that no next page remains", async () => {
  const response = await request("/items?limit=10&offset=20");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.meta, {
    total: 30,
    limit: 10,
    offset: 20,
    returned: 10,
    page: 3,
    totalPages: 3,
    hasPrevious: true,
    hasNext: false,
  });
});

const invalidCases = [
  ["limit=abc", "invalid_limit_invalid_integer"],
  ["limit=0", "invalid_limit_out_of_range"],
  ["offset=-1", "invalid_offset_out_of_range"],
  ["status=pending", "invalid_status"],
  ["sort=unknown", "invalid_sort"],
  ["order=sideways", "invalid_order"],
];

for (const [query, error] of invalidCases) {
  test(`${query} is rejected`, async () => {
    const response = await request(`/items?${query}`);
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error });
  });
}

test("non-GET methods are rejected with Allow header", async () => {
  const response = await request("/items", "POST");
  assert.equal(response.status, 405);
  assert.equal(response.headers.allow, "GET");
});
