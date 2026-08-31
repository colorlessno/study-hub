const http = require("http");
const { handler } = require("../src/handler");
const port = Number(process.env.PORT || 4108);

http.createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", async () => {
    const requestUrl = new URL(req.url, `http://127.0.0.1:${port}`);
    const itemPath = requestUrl.pathname.match(/^\/items\/([^/]+)$/);
    const result = await handler({
      rawPath: requestUrl.pathname,
      rawQueryString: requestUrl.searchParams.toString(),
      pathParameters: itemPath ? { id: decodeURIComponent(itemPath[1]) } : null,
      queryStringParameters: Object.fromEntries(requestUrl.searchParams.entries()),
      body,
      requestContext: { http: { method: req.method } },
    });
    res.writeHead(result.statusCode, result.headers);
    res.end(result.body);
  });
}).listen(port, "127.0.0.1", () => console.log(`local api listening on http://127.0.0.1:${port}`));
