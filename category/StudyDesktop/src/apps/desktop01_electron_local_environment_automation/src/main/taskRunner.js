const { spawn } = require("child_process");
const { randomUUID } = require("crypto");
const { getTask } = require("./commandAllowlist");
const { cleanupRun } = require("./cleanup");

const running = new Map();

function createEvent(runId, type, message, level = "info") {
  return {
    runId,
    type,
    level,
    message,
    timestamp: new Date().toISOString()
  };
}

function startTask(taskId, onEvent) {
  const task = getTask(taskId);
  if (!task) {
    throw new Error(`Task is not allowlisted: ${taskId}`);
  }

  const runId = randomUUID();
  onEvent(createEvent(runId, "queued", `Queued ${taskId}`));

  const child = spawn(task.command, task.args, {
    cwd: process.cwd(),
    shell: false,
    env: {
      ...process.env,
      DESKTOP01_RUN_ID: runId,
      ELECTRON_RUN_AS_NODE: "1"
    }
  });

  const runningTask = { child, cancelRequested: false };
  running.set(runId, runningTask);
  onEvent(createEvent(runId, "running", `Started ${taskId}`));

  child.stdout.on("data", (chunk) => onEvent(createEvent(runId, "stdout", chunk.toString().trim())));
  child.stderr.on("data", (chunk) => onEvent(createEvent(runId, "stderr", chunk.toString().trim(), "warn")));
  child.on("close", (code) => {
    const finishedTask = running.get(runId);
    running.delete(runId);

    if (finishedTask?.cancelRequested) {
      onEvent(createEvent(runId, "cleaning", "Cleaning cancelled run"));
      const cleanupSummary = cleanupRun(runId);
      onEvent(createEvent(runId, "cancelled", JSON.stringify(cleanupSummary)));
      return;
    }

    if (code === 0) {
      onEvent(createEvent(runId, "completed", `${taskId} exited with 0`));
      return;
    }

    onEvent(createEvent(runId, "cleaning", "Cleaning failed run", "warn"));
    const cleanupSummary = cleanupRun(runId);
    onEvent(createEvent(runId, "failed", `${taskId} exited with ${code}; cleanup=${JSON.stringify(cleanupSummary)}`, "error"));
  });

  return { runId };
}

function cancelTask(runId, onEvent) {
  const runningTask = running.get(runId);
  if (!runningTask) {
    return { cancelled: false, reason: "not running" };
  }

  runningTask.cancelRequested = true;
  onEvent(createEvent(runId, "cancelling", "Cancellation requested"));
  const signalSent = runningTask.child.kill();

  if (!signalSent) {
    runningTask.cancelRequested = false;
    return { cancelled: false, reason: "termination signal was not sent" };
  }

  return { cancelled: true };
}

module.exports = { startTask, cancelTask };
