const http = require("http");
const fs = require("fs");
const path = require("path");
const port = Number(process.env.PORT || 4103);
const demoHtml = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

const permissions = {
  "orders:read": ["admin", "operator", "viewer"],
  "orders:cancel": ["admin", "operator"],
};

const users = {
  "a-admin": { id: "a-admin", role: "admin" },
  "o-operator": { id: "o-operator", role: "operator" },
  "v-viewer": { id: "v-viewer", role: "viewer" },
};

function authorize(role, action) {
  return permissions[action]?.includes(role) === true;
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function sendHtml(res) {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(demoHtml);
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true });
    if (req.method === "GET" && req.url === "/demo") return sendHtml(res);
    const user = users[req.headers["x-user"]];
    if (!user) return send(res, 401, { error: "unauthenticated" });
    if (req.method === "GET" && req.url === "/orders") {
      return authorize(user.role, "orders:read")
        ? send(res, 200, { user, orders: [{ id: "o-100", status: "open" }] })
        : send(res, 403, { error: "forbidden" });
    }
    if (req.method === "POST" && req.url === "/orders/o-100/cancel") {
      return authorize(user.role, "orders:cancel")
        ? send(res, 200, { user, id: "o-100", status: "canceled" })
        : send(res, 403, { error: "forbidden" });
    }
    return send(res, 404, { error: "not_found" });
  });
}

if (require.main === module) {
  createServer().listen(port, "127.0.0.1", () => console.log(`security03 listening on http://127.0.0.1:${port}`));
}

module.exports = { authorize, createServer };
