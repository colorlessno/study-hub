const fs = require("fs");

const processOneCommand = fs.readFileSync("/proc/1/cmdline", "utf8")
  .split("\0")
  .filter(Boolean)
  .join(" ");

console.log(JSON.stringify({
  processOneCommand,
  workingDirectory: process.cwd(),
  runtime: process.version,
  environment: {
    PORT: process.env.PORT || "4103 (default)",
  },
}, null, 2));
