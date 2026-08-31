const { unsafeSearch, safeSearch } = require("./query_builder");

const scenarios = {
  attack: { name: "' or '1'='1", status: "active" },
  "name-only": { name: "Keyboard", status: "" },
  "status-only": { name: "", status: "active" },
};

const scenario = process.argv[2] || "attack";
const input = scenarios[scenario];
if (!input) {
  console.error(`unknown scenario: ${scenario}`);
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    scenario,
    input,
    unsafeSql: unsafeSearch(input.name),
    safeQuery: safeSearch(input.name, input.status),
  }, null, 2));
}
