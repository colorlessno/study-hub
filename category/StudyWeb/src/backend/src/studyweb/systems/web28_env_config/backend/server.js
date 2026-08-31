"use strict";

const http = require("node:http");

const requiredEnv = ["PORT", "DATABASE_URL", "APP_MESSAGE"];

function readConfig(env = process.env) {
  const missing = requiredEnv.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(", ")}`);
  }

  const port = Number(env.PORT);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("Invalid PORT. PORT must be an integer from 1 to 65535.");
  }

  return {
    port,
    databaseUrl: env.DATABASE_URL,
    message: env.APP_MESSAGE,
  };
}

function createServer(config) {
  return http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200);
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (req.method === "GET" && req.url === "/config-check") {
      res.writeHead(200);
      res.end(
        JSON.stringify({
          status: "ok",
          apiPort: config.port,
          hasDatabaseUrl: Boolean(config.databaseUrl),
          message: config.message,
        }),
      );
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "not_found" }));
  });
}

function startServer(env = process.env) {
  let config;
  try {
    config = readConfig(env);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return null;
  }

  const server = createServer(config);
  server.listen(config.port, () => {
    console.log(`web28 backend listening on ${config.port}`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { createServer, readConfig, startServer };
