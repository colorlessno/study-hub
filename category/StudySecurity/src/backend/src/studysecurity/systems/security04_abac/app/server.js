const http = require("http");
const port = Number(process.env.PORT || 4104);

const users = {
  alice: { id: "alice", role: "staff", department: "sales" },
  bob: { id: "bob", role: "staff", department: "support" },
  admin: { id: "admin", role: "admin", department: "hq" },
};
const initialOrders = {
  "o-200": { id: "o-200", department: "sales", status: "draft" },
  "o-201": { id: "o-201", department: "support", status: "confirmed" },
};

function canRead(user, target) {
  return user.role === "admin" || user.department === target.department;
}

function canUpdate(user, target) {
  return canRead(user, target) && target.status === "draft";
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

function createServer() {
  const orders = structuredClone(initialOrders);
  return http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true });
    const user = users[req.headers["x-user"]];
    if (!user) return send(res, 401, { error: "unauthenticated" });
    const match = req.url.match(/^\/orders\/(o-\d+)$/);
    const order = match ? orders[match[1]] : undefined;
    if (match && !order) return send(res, 404, { error: "not_found" });
    if (req.method === "GET" && order) {
      return canRead(user, order) ? send(res, 200, order) : send(res, 403, { error: "forbidden" });
    }
    if (req.method === "PATCH" && order) {
      if (!canUpdate(user, order)) return send(res, 403, { error: "forbidden" });
      let body;
      try {
        body = await readJson(req);
      } catch (error) {
        return send(res, 400, { error: "invalid_json" });
      }
      if (typeof body.note !== "string" || !body.note.trim() || body.note.length > 100) {
        return send(res, 400, { error: "invalid_note" });
      }
      order.note = body.note.trim();
      order.updatedBy = user.id;
      return send(res, 200, order);
    }
    return send(res, 404, { error: "not_found" });
  });
}

if (require.main === module) {
  createServer().listen(port, "127.0.0.1", () => console.log(`security04 listening on http://127.0.0.1:${port}`));
}

module.exports = { canRead, canUpdate, createServer };
