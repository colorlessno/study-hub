const http = require("http");
const allowed = new Set(["http://localhost:3000", "http://localhost:5173"]);
const allowedMethods = new Set(["GET", "POST"]);
const allowedHeaders = new Set(["content-type", "authorization"]);
const port = Number(process.env.PORT || 4114);

function requestedHeaders(value) {
  return String(value || "")
    .split(",")
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean);
}

function canPreflight(req) {
  const originAllowed = allowed.has(req.headers.origin);
  const methodAllowed = allowedMethods.has(String(req.headers["access-control-request-method"] || "").toUpperCase());
  const headersAllowed = requestedHeaders(req.headers["access-control-request-headers"])
    .every((header) => allowedHeaders.has(header));
  return originAllowed && methodAllowed && headersAllowed;
}

function corsHeaders(origin) {
  const varyingHeaders = { "Vary": "Origin, Access-Control-Request-Method, Access-Control-Request-Headers" };
  if (!allowed.has(origin)) return varyingHeaders;
  return {
    ...varyingHeaders,
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  };
}

http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Cache-Control": "no-store" });
    return res.end("ok");
  }

  const headers = corsHeaders(req.headers.origin);
  if (req.method === "OPTIONS") {
    res.writeHead(canPreflight(req) ? 204 : 403, headers);
    return res.end();
  }
  res.writeHead(200, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify({ ok: true }));
}).listen(port, "127.0.0.1", () => console.log(`security14 listening on http://127.0.0.1:${port}`));
