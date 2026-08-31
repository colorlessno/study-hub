const http = require("http");
const crypto = require("crypto");
const port = Number(process.env.PORT || 4102);

const secret = process.env.JWT_SECRET || "example-jwt-secret";
const user = { id: "u-demo", password: "passw0rd" };

function b64url(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(data) {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

function issueToken(expiresInSeconds = 600) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ sub: "u-demo", role: "operator", iat: now, exp: now + expiresInSeconds }));
  const body = `${header}.${payload}`;
  return `${body}.${sign(body)}`;
}

function verify(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("format");
  const body = `${parts[0]}.${parts[1]}`;
  const expectedSignature = Buffer.from(sign(body));
  const actualSignature = Buffer.from(parts[2]);
  if (expectedSignature.length !== actualSignature.length || !crypto.timingSafeEqual(expectedSignature, actualSignature)) throw new Error("signature");
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  if (header.alg !== "HS256" || header.typ !== "JWT") throw new Error("header");
  const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  if (typeof claims.exp !== "number" || claims.exp < Math.floor(Date.now() / 1000)) throw new Error("expired");
  return claims;
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function sendVerification(res, token) {
  try {
    return send(res, 200, { claims: verify(token) });
  } catch (error) {
    return send(res, 401, { error: error.message });
  }
}

function createServer() {
  return http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true });
    if (req.method === "POST" && req.url === "/token") {
      let body;
      try {
        body = await readJson(req);
      } catch (error) {
        return send(res, 400, { error: "invalid_json" });
      }
      if (body.userId !== user.id || body.password !== user.password) {
        return send(res, 401, { error: "invalid_credentials" });
      }
      return send(res, 200, { token: issueToken() });
    }
    if (req.method === "POST" && req.url === "/token/expired") return send(res, 200, { token: issueToken(-60) });
    if (req.method === "GET" && req.url === "/demo/valid") return sendVerification(res, issueToken());
    if (req.method === "GET" && req.url === "/demo/expired") return sendVerification(res, issueToken(-60));
    if (req.method === "GET" && req.url === "/demo/tampered") {
      const token = issueToken();
      const replacement = token.endsWith("x") ? "y" : "x";
      return sendVerification(res, `${token.slice(0, -1)}${replacement}`);
    }
    if (req.method === "GET" && req.url === "/profile") {
      const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      return sendVerification(res, token);
    }
    return send(res, 404, { error: "not_found" });
  });
}

if (require.main === module) {
  createServer().listen(port, "127.0.0.1", () => console.log(`security02 listening on http://127.0.0.1:${port}`));
}

module.exports = { createServer, issueToken, verify };
