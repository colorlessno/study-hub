const http = require("http");
const crypto = require("crypto");
const port = Number(process.env.PORT || 4101);

const sessions = new Map();
const user = { id: "u-demo", name: "Demo User", password: "passw0rd" };

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").filter(Boolean).map((v) => {
    const [k, ...rest] = v.trim().split("=");
    return [k, decodeURIComponent(rest.join("="))];
  }));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
  res.end(JSON.stringify(body));
}

http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true });
  if (req.method === "POST" && req.url === "/login") {
    let body;
    try {
      body = await readJson(req);
    } catch (error) {
      return send(res, 400, { error: "invalid_json" });
    }
    if (body.userId !== user.id || body.password !== user.password) return send(res, 401, { error: "invalid_credentials" });
    const sid = crypto.randomBytes(16).toString("hex");
    sessions.set(sid, { userId: user.id, name: user.name });
    return send(res, 200, { ok: true }, { "Set-Cookie": `sid=${sid}; HttpOnly; SameSite=Lax; Path=/` });
  }
  const sid = parseCookies(req.headers.cookie).sid;
  if (req.method === "GET" && req.url === "/me") {
    const session = sessions.get(sid);
    return session ? send(res, 200, { user: session }) : send(res, 401, { error: "login_required" });
  }
  if (req.method === "POST" && req.url === "/logout") {
    if (sid) sessions.delete(sid);
    return send(res, 200, { ok: true }, { "Set-Cookie": "sid=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/" });
  }
  send(res, 404, { error: "not_found" });
}).listen(port, "127.0.0.1", () => console.log(`security01 listening on http://127.0.0.1:${port}`));
