const http = require("http");
const port = Number(process.env.DB_PORT || 5432);

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ service: "db", internalOnly: true, records: 1 }));
}).listen(port, () => console.log(`db internal endpoint :${port}`));
