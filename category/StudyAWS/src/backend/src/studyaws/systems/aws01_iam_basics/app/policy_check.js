const fs = require("fs");
const path = require("path");

function match(pattern, value) {
  if (pattern === "*") return true;
  if (pattern.endsWith("*")) return value.startsWith(pattern.slice(0, -1));
  return pattern === value;
}

function evaluate(policy, action, resource) {
  let allowed = false;
  for (const statement of policy.statements) {
    const actionMatch = statement.actions.some((p) => match(p, action));
    const resourceMatch = statement.resources.some((p) => match(p, resource));
    if (!actionMatch || !resourceMatch) continue;
    if (statement.effect === "Deny") return "explicitDeny";
    if (statement.effect === "Allow") allowed = true;
  }
  return allowed ? "allow" : "implicitDeny";
}

const dir = path.join(__dirname, "..", "policies");
const cases = [
  ["s3:GetObject", "arn:aws:s3:::study-bucket/orders.csv"],
  ["s3:PutObject", "arn:aws:s3:::study-bucket/orders.csv"],
  ["s3:DeleteObject", "arn:aws:s3:::study-bucket/orders.csv"],
  ["logs:FilterLogEvents", "arn:aws:logs:::study-app"],
];

const mode = process.argv[2] || "all";
const filtersByMode = {
  all: () => true,
  allow: (result) => result.decision === "allow",
  "implicit-deny": (result) => result.decision === "implicitDeny",
  "explicit-deny": (result) => result.decision === "explicitDeny",
  "admin-risk": (result) => result.policy === "admin" && result.decision === "allow",
};

if (!(mode in filtersByMode)) {
  console.error(`unknown mode: ${mode}`);
  console.error(`choose: ${Object.keys(filtersByMode).join(", ")}`);
  process.exit(1);
}

const filterResult = filtersByMode[mode];
const results = [];

for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".json")).sort()) {
  const policy = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  for (const [action, resource] of cases) {
    const decision = evaluate(policy, action, resource);
    const result = { policy: policy.name, action, resource, decision };
    if (filterResult(result)) results.push(result);
  }
}

console.log(`=== IAM policy decisions: ${mode} ===`);
for (const result of results) console.log(JSON.stringify(result, null, 2));
console.log(`matched: ${results.length}`);
