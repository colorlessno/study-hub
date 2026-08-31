const fs = require("fs");
const path = require("path");
const severityOrder = { critical: 4, high: 3, moderate: 2, low: 1, info: 0 };

function buildRemediationPlan(report) {
  if (!report || !Array.isArray(report.vulnerabilities)) {
    throw new TypeError("vulnerabilities must be an array");
  }

  const actions = report.vulnerabilities.map((vulnerability, index) => {
    if (!vulnerability || typeof vulnerability !== "object" || Array.isArray(vulnerability)) {
      throw new TypeError(`vulnerabilities[${index}] must be an object`);
    }
    const packageName = String(vulnerability.package || "").trim();
    if (!packageName) {
      throw new TypeError(`vulnerabilities[${index}].package must be a non-empty string`);
    }
    if (typeof vulnerability.fixAvailable !== "boolean") {
      throw new TypeError(`vulnerabilities[${index}].fixAvailable must be a boolean`);
    }
    const severity = String(vulnerability.severity || "unknown").toLowerCase();
    return {
      package: packageName,
      severity,
      fixAvailable: vulnerability.fixAvailable,
      action: vulnerability.fixAvailable ? "update" : "review",
      note: String(vulnerability.note || ""),
    };
  }).sort((a, b) => (severityOrder[b.severity] ?? -1) - (severityOrder[a.severity] ?? -1));

  const summary = actions.reduce((counts, item) => {
    counts[item.severity] = (counts[item.severity] || 0) + 1;
    return counts;
  }, {});
  return { summary, actions };
}

if (require.main === module) {
  const mode = process.argv[2] || "full";
  if (mode === "invalid") {
    let rejection;
    try {
      buildRemediationPlan({ vulnerabilities: "invalid" });
    } catch (error) {
      rejection = { rejected: true, error: error.message };
    }
    if (!rejection) throw new Error("invalid report was accepted");
    console.log(JSON.stringify(rejection, null, 2));
  } else if (["full", "summary", "actions"].includes(mode)) {
    const report = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "samples", "npm_audit_sample.json"), "utf8"));
    const plan = buildRemediationPlan(report);
    const output = mode === "summary"
      ? plan.summary
      : mode === "actions"
        ? plan.actions
        : plan;
    console.log(JSON.stringify(output, null, 2));
  } else {
    throw new Error(`unknown mode: ${mode}`);
  }
}

module.exports = { buildRemediationPlan };
