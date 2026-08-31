const fs = require("fs");
const path = require("path");
const { handler } = require("../src/handler");

async function main() {
  const operation = process.argv[2] || "valid-event";
  let event;

  if (operation === "valid-event") {
    const eventPath = path.join(__dirname, "..", "events", "hello.json");
    event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
  } else if (operation === "missing-name") {
    event = { queryStringParameters: {}, body: null };
  } else if (operation === "runtime-settings") {
    process.env.GREETING_PREFIX = "welcome";
    event = { queryStringParameters: { name: "runtime" }, body: null };
  } else {
    throw new Error(`unknown operation: ${operation}`);
  }

  const result = await handler(event, {
    awsRequestId: "local-001",
    functionName: "HelloFunction",
    memoryLimitInMB: "128",
    getRemainingTimeInMillis: () => 5000,
  });
  console.log(JSON.stringify({
    operation,
    statusCode: result.statusCode,
    headers: result.headers,
    body: JSON.parse(result.body),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
