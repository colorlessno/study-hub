const http = require("http");
const port = Number(process.env.WEB_PORT || 4102);

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ service: "web", publicPort: port, talksTo: "api:5102" }));
}).listen(port, () => console.log(`web public endpoint http://localhost:${port}`));
