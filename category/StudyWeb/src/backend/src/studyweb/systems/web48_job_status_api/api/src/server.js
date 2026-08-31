"use strict";

const { randomUUID } = require("node:crypto");
const http = require("node:http");
const port = Number(process.env.PORT || 3048);

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function createJobController({
  jobs = new Map(),
  createJobId = () => `job_${randomUUID()}`,
  schedule = setTimeout,
} = {}) {
  return {
    create({ shouldFail = false } = {}) {
      const id = createJobId();
      jobs.set(id, { id, status: "queued" });
      schedule(() => {
        jobs.set(id, { id, status: "running" });
        schedule(() => jobs.set(
          id,
          shouldFail
            ? { id, status: "failed", error: "sample_processing_failed" }
            : { id, status: "succeeded", result: "done" },
        ), 600);
      }, 300);
      return jobs.get(id);
    },
    get(id) {
      return jobs.get(id);
    },
  };
}

function createServer({ controller = createJobController() } = {}) {
  return http.createServer((req, res) => {
    const parsed = new URL(req.url, "http://localhost");
    if (req.method === "POST" && parsed.pathname === "/jobs") {
      const outcome = parsed.searchParams.get("outcome") || "succeeded";
      if (!new Set(["succeeded", "failed"]).has(outcome)) {
        return send(res, 400, { error: "invalid_outcome" });
      }
      return send(res, 202, controller.create({ shouldFail: outcome === "failed" }));
    }
    const match = parsed.pathname.match(/^\/jobs\/([^/]+)$/);
    if (req.method === "GET" && match) {
      const job = controller.get(match[1]);
      return send(res, job ? 200 : 404, job || { error: "not_found" });
    }
    return send(res, 404, { error: "not_found" });
  });
}

if (require.main === module) {
  createServer().listen(port, "127.0.0.1", () => console.log(`web48 http://127.0.0.1:${port}`));
}

module.exports = { createJobController, createServer };
