const http = require("http");
const port = Number(process.env.API_PORT || 5102);
const databaseUrl = process.env.DATABASE_URL || "http://db:5432";

http.createServer(async (req, res) => {
  if (req.url === "/database") {
    try {
      const databaseResponse = await fetch(databaseUrl, { signal: AbortSignal.timeout(2000) });
      const database = await databaseResponse.json();
      res.writeHead(databaseResponse.ok ? 200 : 502, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ service: "api", database }));
    } catch (error) {
      res.writeHead(502, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({
        service: "api",
        error: "database_unreachable",
        reason: error instanceof Error ? error.cause?.code || error.name : "unknown",
      }));
    }
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ service: "api", internalOnly: true, talksTo: "db:5432" }));
}).listen(port, () => console.log(`api internal endpoint :${port}`));
