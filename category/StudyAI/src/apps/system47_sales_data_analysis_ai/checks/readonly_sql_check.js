const fs = require("fs");
const path = require("path");

const forbidden = [
  "insert",
  "update",
  "delete",
  "merge",
  "drop",
  "alter",
  "create",
  "truncate",
  "grant",
  "revoke",
  "copy",
  "\\copy"
];

function assertReadOnlySql(sql) {
  const withoutComments = sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .toLowerCase();
  const hits = forbidden.filter((word) => new RegExp(`\\b${word.replace("\\", "\\\\")}\\b`, "i").test(withoutComments));
  if (hits.length > 0) throw new Error(`Not read-only: ${hits.join(", ")}`);
}

if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node checks/readonly_sql_check.js <sql-file>");
    process.exit(2);
  }

  try {
    assertReadOnlySql(fs.readFileSync(path.resolve(filePath), "utf8"));
    console.log(`Read-only SQL check passed: ${filePath}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { assertReadOnlySql };
