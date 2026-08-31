const fs = require("fs");

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node validate_input.js <file>");
  process.exit(1);
}

const text = fs.readFileSync(inputPath, "utf8");
const forbidden = ["secret", "token", "password"];
const found = forbidden.filter((word) => text.toLowerCase().includes(word));

const required = ["task_goal", "target_file", "expected_output"];
const missing = required.filter((field) => !text.includes(field));

if (missing.length > 0) {
  console.error(`missing required fields: ${missing.join(", ")}`);
  process.exit(1);
}

if (found.length > 0) {
  console.error(`forbidden words found: ${found.join(", ")}`);
  process.exit(1);
}

console.log("input sample looks valid");
