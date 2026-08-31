const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").filter(Boolean).map((part) => {
    const [key, ...rest] = part.trim().split("=");
    return [key, decodeURIComponent(rest.join("="))];
  }));
}

function send(res, status, body, type = "application/json; charset=utf-8", headers = {}) {
  res.writeHead(status, { "Content-Type": type, ...headers });
  res.end(type.startsWith("application/json") ? JSON.stringify(body) : body);
}

function createServer() {
  const tokens = new Map();
  let balance = 1000;

  function issueToken() {
    const token = crypto.randomBytes(12).toString("hex");
    tokens.set(token, Date.now() + 5 * 60 * 1000);
    return token;
  }

  return http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      return send(res, 200, { status: "ok" });
    }
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(302, { Location: "/demo" });
      return res.end();
    }
    if (req.method === "GET" && req.url === "/demo") {
      const page = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
      return send(res, 200, page, "text/html; charset=utf-8");
    }
    if (req.method === "GET" && req.url === "/form") {
      const token = issueToken();
      return send(
        res,
        200,
        `<form method="post" action="/transfer"><input name="csrf" value="${token}"><button>send</button></form>`,
        "text/html; charset=utf-8",
        { "Set-Cookie": "sid=demo; HttpOnly; SameSite=Lax; Path=/" },
      );
    }
    if (req.method === "GET" && req.url === "/token") {
      const token = issueToken();
      return send(res, 200, { token, expiresInSeconds: 300 }, "application/json; charset=utf-8", {
        "Set-Cookie": "sid=demo; HttpOnly; SameSite=Lax; Path=/",
      });
    }
    if (req.method === "POST" && req.url === "/demo/reset") {
      tokens.clear();
      balance = 1000;
      return send(res, 200, { balance, reset: true }, "application/json; charset=utf-8", {
        "Set-Cookie": "sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
      });
    }
    if (req.method === "POST" && req.url === "/transfer") {
      if (parseCookies(req.headers.cookie).sid !== "demo") return send(res, 401, { error: "login_required" });
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        const contentType = req.headers["content-type"] || "";
        let token;
        if (contentType.includes("application/json")) {
          try {
            token = JSON.parse(body).csrf;
          } catch {
            return send(res, 400, { error: "invalid_json" });
          }
        } else {
          token = new URLSearchParams(body).get("csrf");
        }
        const expiresAt = token ? tokens.get(token) : undefined;
        if (token) tokens.delete(token);
        if (!expiresAt || expiresAt < Date.now()) return send(res, 403, { error: "invalid_csrf" });
        balance -= 1;
        return send(res, 200, { balance });
      });
      return;
    }
    return send(res, 404, { error: "not_found" });
  });
}

const port = Number(process.env.PORT || 4107);
if (require.main === module) {
  createServer().listen(port, "127.0.0.1", () => {
    console.log(`security07 listening on http://127.0.0.1:${port}`);
  });
}

module.exports = { createServer };
