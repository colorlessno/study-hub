const http = require("http");
const port = Number(process.env.PORT || 4109);
const host = process.env.HOST || "127.0.0.1";
const appName = process.env.APP_NAME || "studyaws-simple-deploy";
const deployEnv = process.env.DEPLOY_ENV || "local";
let serviceState = "ready";

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  console.log(JSON.stringify({ at: new Date().toISOString(), method: req.method, path: url.pathname }));

  if (req.method === "GET" && url.pathname === "/health") {
    const ready = serviceState === "ready";
    return sendJson(res, ready ? 200 : 503, {
      ok: ready,
      state: serviceState,
      appName,
      deployEnv,
    });
  }

  if (req.method === "GET" && url.pathname === "/config") {
    const required = url.searchParams.get("required") || "APP_NAME,DEPLOY_ENV";
    const effectiveConfig = { APP_NAME: appName, DEPLOY_ENV: deployEnv };
    const missing = required
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name && !String(effectiveConfig[name] || process.env[name] || "").trim());
    return sendJson(res, missing.length === 0 ? 200 : 503, {
      ok: missing.length === 0,
      required: required.split(",").map((name) => name.trim()),
      missing,
    });
  }

  if (req.method === "POST" && url.pathname === "/simulate-failure") {
    serviceState = "failed";
    return sendJson(res, 500, { ok: false, state: serviceState, reason: "simulated_runtime_failure" });
  }

  if (req.method === "POST" && url.pathname === "/recover") {
    serviceState = "ready";
    return sendJson(res, 200, { ok: true, state: serviceState });
  }

  if (req.method === "GET" && url.pathname === "/") {
    return sendJson(res, 200, { appName, deployEnv, message: "ready" });
  }

  sendJson(res, 404, { error: "not_found" });
}).listen(port, host, () => console.log(`${appName} listening on ${host}:${port}`));
