const assert = require("assert");
const { audit } = require("./audit_logger");

const scenario = process.argv[2] || "all";
const validScenarios = new Set(["all", "success", "denied"]);
if (!validScenarios.has(scenario)) {
  console.error(JSON.stringify({ error: "unknown_scenario", scenario }));
  process.exitCode = 1;
} else {
  if (scenario === "all" || scenario === "success") {
    const success = audit({ actor: "u-demo", action: "order.cancel", target: "order:o-100", result: "success", requestId: "req-1" });
    assert.strictEqual(success.result, "success");
  }

  if (scenario === "all" || scenario === "denied") {
    const denied = audit({ actor: "u-viewer", action: "credential.rotate", target: "credential:example-api-token", result: "denied", reason: "role denied for demo@example.com", requestId: "req-2" });
    assert.strictEqual(denied.target, "credential:[secret]");
    assert.strictEqual(denied.reason, "role denied for [email]");
  }
}
