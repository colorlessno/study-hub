const { Client } = require("pg");

const required = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"];
const scenario = process.argv[2] || "successful-connection";
const supportedScenarios = new Set([
  "successful-connection",
  "authentication-failure",
  "network-failure",
]);

if (!supportedScenarios.has(scenario)) {
  console.error(`unknown scenario: ${scenario}`);
  process.exit(1);
}

const missing = required.filter((key) => !process.env[key]);
const connection = {
  host: process.env.DB_HOST || "not-set",
  port: Number(process.env.DB_PORT || 0),
  database: process.env.DB_NAME || "not-set",
  user: process.env.DB_USER || "not-set",
  password: process.env.DB_PASSWORD ? "masked" : "not-set",
};

function output(result) {
  console.log(JSON.stringify({ scenario, connection, ...result }, null, 2));
}

async function main() {
  if (missing.length > 0) {
    output({ ok: false, error: { kind: "missing-configuration", fields: missing } });
    process.exitCode = 1;
    return;
  }

  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 3000,
  });

  try {
    await client.connect();
    const result = await client.query(
      "SELECT current_database() AS database, current_user AS user, inet_server_addr()::text AS server_address, inet_server_port() AS server_port",
    );
    if (scenario !== "successful-connection") {
      output({ ok: false, error: { kind: "unexpected-success" } });
      process.exitCode = 1;
      return;
    }
    output({ ok: true, database: result.rows[0] });
  } catch (error) {
    const code = typeof error?.code === "string" ? error.code : "UNKNOWN";
    const expected = scenario === "authentication-failure"
      ? code === "28P01"
      : scenario === "network-failure" && ["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND"].includes(code);
    output({
      ok: expected,
      expectedFailure: scenario !== "successful-connection",
      error: { kind: scenario, code },
    });
    if (!expected) process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();
