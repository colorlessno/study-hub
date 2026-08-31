"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const { after, before, test } = require("node:test");
const { createServer, parseCookie } = require("../server/src/server");

let server;
let port;

before(async () => {
  server = createServer({ createSessionId: () => "sid_test" });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  port = server.address().port;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

function request({ method = "GET", path, cookie }) {
  return new Promise((resolve, reject) => {
    const headers = cookie ? { Cookie: cookie } : {};
    const req = http.request({ host: "127.0.0.1", port, method, path, headers }, (res) => {
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

test("cookie parser preserves values containing equals signs", () => {
  assert.deepEqual(parseCookie("sid=a=b; theme=dark"), { sid: "a=b", theme: "dark" });
});

test("login, authenticated lookup, logout, and expired session form one lifecycle", async () => {
  const anonymous = await request({ path: "/me" });
  assert.equal(anonymous.status, 401);

  const login = await request({ method: "POST", path: "/login" });
  assert.equal(login.status, 200);
  const setCookie = login.headers["set-cookie"][0];
  assert.match(setCookie, /^sid=sid_test;/);
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Lax/);
  assert.match(setCookie, /Path=\//);

  const authenticated = await request({ path: "/me", cookie: "sid=sid_test" });
  assert.equal(authenticated.status, 200);
  assert.deepEqual(authenticated.body.user, { userId: "user01", name: "Study User" });

  const logout = await request({ method: "POST", path: "/logout", cookie: "sid=sid_test" });
  assert.equal(logout.status, 200);
  assert.match(logout.headers["set-cookie"][0], /Max-Age=0/);

  const afterLogout = await request({ path: "/me", cookie: "sid=sid_test" });
  assert.equal(afterLogout.status, 401);
});

test("unknown route returns 404", async () => {
  const response = await request({ path: "/unknown" });
  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { error: "not_found" });
});
