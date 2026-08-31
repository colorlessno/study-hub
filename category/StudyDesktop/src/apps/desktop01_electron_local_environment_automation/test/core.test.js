const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const appRoot = path.resolve(__dirname, "..");
const planScript = path.join(appRoot, "scripts", "safe_install_plan.js");
const { cleanupRun, workspaceDir } = require("../src/main/cleanup");
const { getTask, listTasks } = require("../src/main/commandAllowlist");
const { cancelTask, startTask } = require("../src/main/taskRunner");

function runPlan(mode, runId) {
  return spawnSync(process.execPath, [planScript, mode], {
    cwd: appRoot,
    encoding: "utf8",
    env: { ...process.env, DESKTOP01_RUN_ID: runId }
  });
}

test("allowlist exposes only the predefined task IDs", () => {
  const taskIds = listTasks().map(({ taskId }) => taskId);

  assert.deepEqual(taskIds, ["plan-only", "mock-clone", "mock-venv", "mock-install", "mock-wait", "mock-failure"]);
  assert.equal(getTask("unknown-task"), null);
});

test("plan mode explains the mock sequence without writing files", () => {
  const runId = `verify-plan-${process.pid}-${Date.now()}`;
  const result = runPlan("--plan", runId);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /1\. mock clone/);
  assert.equal(fs.existsSync(path.join(workspaceDir, runId)), false);
});

test("mock modes write only inside one run directory and can be cleaned", () => {
  const runId = `verify-write-${process.pid}-${Date.now()}`;
  const runDir = path.join(workspaceDir, runId);

  try {
    for (const mode of ["--mock-clone", "--mock-venv", "--mock-install"]) {
      const result = runPlan(mode, runId);
      assert.equal(result.status, 0, result.stderr);
    }

    assert.equal(path.dirname(runDir), workspaceDir);
    assert.equal(fs.readFileSync(path.join(runDir, "mock-repository.txt"), "utf8"), "mock cloned repository\n");
    assert.equal(fs.readFileSync(path.join(runDir, "mock-venv.txt"), "utf8"), "mock python venv\n");
    assert.equal(fs.readFileSync(path.join(runDir, "mock-install.log"), "utf8"), "mock dependency install completed\n");
  } finally {
    cleanupRun(runId);
  }

  assert.equal(fs.existsSync(runDir), false);
});

test("cleanup refuses a path outside the app workspace", () => {
  assert.throws(() => cleanupRun(path.join("..", "outside-workspace")), /Refusing to clean outside workspace/);
});

test("task runner rejects unknown tasks and reports the valid state sequence", async () => {
  assert.throws(() => startTask("unknown-task", () => {}), /Task is not allowlisted/);

  const events = [];
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("plan-only task timed out")), 5000);

    startTask("plan-only", (event) => {
      events.push(event);
      if (event.type === "completed" || event.type === "failed") {
        clearTimeout(timeout);
        resolve();
      }
    });
  });

  const stateEvents = events
    .filter(({ type }) => ["queued", "running", "completed", "failed"].includes(type))
    .map(({ type }) => type);

  assert.deepEqual(stateEvents, ["queued", "running", "completed"]);
});

test("cancel waits for child exit, cleans the run, and does not report failure", async () => {
  const events = [];
  let finish;
  const finished = new Promise((resolve, reject) => {
    finish = { resolve, reject };
  });
  const onEvent = (event) => {
    events.push(event);
    if (event.type === "cancelled") {
      finish.resolve();
    }
    if (event.type === "failed") {
      finish.reject(new Error("cancelled task was reported as failed"));
    }
  };

  const { runId } = startTask("mock-wait", onEvent);
  const cancelResult = cancelTask(runId, onEvent);

  assert.equal(cancelResult.cancelled, true);
  let timeout;
  try {
    await Promise.race([
      finished,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error("cancel task timed out")), 7000);
      })
    ]);
  } finally {
    clearTimeout(timeout);
  }

  const stateEvents = events
    .filter(({ type }) => ["queued", "running", "cancelling", "cleaning", "cancelled", "failed"].includes(type))
    .map(({ type }) => type);

  assert.deepEqual(stateEvents, ["queued", "running", "cancelling", "cleaning", "cancelled"]);
});

test("failed task cleans its run directory before reporting failure", async () => {
  const events = [];
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("mock-failure task timed out")), 5000);

    const started = startTask("mock-failure", (event) => {
      events.push(event);
      if (event.type === "failed") {
        clearTimeout(timeout);
        resolve({ event, runId: started.runId });
      }
    });
  });

  const stateEvents = events
    .filter(({ type }) => ["queued", "running", "cleaning", "failed"].includes(type))
    .map(({ type }) => type);

  assert.deepEqual(stateEvents, ["queued", "running", "cleaning", "failed"]);
  assert.match(result.event.message, /cleanup=.*"cleaned":true/);
  assert.equal(fs.existsSync(path.join(workspaceDir, result.runId)), false);
});
