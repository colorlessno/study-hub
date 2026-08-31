const required = ["APP_SECRET", "WEBHOOK_SECRET"];
const missing = required.filter((name) => !process.env[name]);
const expectMissing = process.argv[2] === "expect-missing";

if (missing.length) {
  const result = { error: "missing_environment", names: missing, values: "not_displayed" };
  if (expectMissing) {
    console.log(JSON.stringify({ expectedFailure: true, ...result }));
  } else {
    console.error(JSON.stringify(result));
    process.exitCode = 1;
  }
} else {
  console.log(JSON.stringify({ loaded: required, values: "masked" }));
}
