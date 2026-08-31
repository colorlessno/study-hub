const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const workspace = path.join(root, "workspace");
const runId = process.env.DESKTOP01_RUN_ID || "manual-run";
const runDir = path.join(workspace, runId);

function ensureRunDir() {
  fs.mkdirSync(runDir, { recursive: true });
}

function writeRelative(fileName, content) {
  ensureRunDir();
  fs.writeFileSync(path.join(runDir, fileName), content, "utf8");
}

function main() {
  const mode = process.argv[2] || "--plan";
  console.log(`desktop01 mode=${mode}`);

  if (mode === "--plan") {
    console.log("1. mock clone");
    console.log("2. mock venv");
    console.log("3. mock install");
    return;
  }

  if (mode === "--mock-clone") {
    writeRelative("mock-repository.txt", "mock cloned repository\n");
    console.log("created workspace mock repository");
    return;
  }

  if (mode === "--mock-venv") {
    writeRelative("mock-venv.txt", "mock python venv\n");
    console.log("created mock venv marker");
    return;
  }

  if (mode === "--mock-install") {
    writeRelative("mock-install.log", "mock dependency install completed\n");
    console.log("created mock install log");
    return;
  }

  if (mode === "--mock-wait") {
    console.log("mock wait started; cancel this task from the UI");
    setTimeout(() => console.log("mock wait completed"), 5000);
    return;
  }

  if (mode === "--mock-failure") {
    writeRelative("incomplete-artifact.txt", "cleanup target\n");
    console.error("mock failure requested");
    process.exit(1);
  }

  console.error(`unknown mode: ${mode}`);
  process.exit(1);
}

main();
