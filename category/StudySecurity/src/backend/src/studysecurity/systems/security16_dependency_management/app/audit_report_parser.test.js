const assert = require("assert");
const { buildRemediationPlan } = require("./audit_report_parser");

const plan = buildRemediationPlan({
  vulnerabilities: [
    { package: "demo-low", severity: "low", fixAvailable: false, note: "review" },
    { package: "demo-high", severity: "high", fixAvailable: true, note: "update" },
  ],
});

assert.deepStrictEqual(plan.summary, { high: 1, low: 1 });
assert.deepStrictEqual(plan.actions.map((item) => item.package), ["demo-high", "demo-low"]);
assert.deepStrictEqual(plan.actions.map((item) => item.fixAvailable), [true, false]);
assert.deepStrictEqual(plan.actions.map((item) => item.action), ["update", "review"]);
assert.throws(() => buildRemediationPlan({ vulnerabilities: "invalid" }), /must be an array/);
assert.throws(() => buildRemediationPlan({
  vulnerabilities: [{ package: "demo", severity: "high", note: "missing fix flag" }],
}), /fixAvailable must be a boolean/);

console.log("security16 audit report parser tests passed");
