const path = require("path");

const rootDir = path.resolve(__dirname, "../..");

const tasks = {
  "plan-only": {
    command: process.execPath,
    args: [path.join(rootDir, "scripts", "safe_install_plan.js"), "--plan"],
    description: "Show the mock install plan only."
  },
  "mock-clone": {
    command: process.execPath,
    args: [path.join(rootDir, "scripts", "safe_install_plan.js"), "--mock-clone"],
    description: "Create mock cloned files under workspace."
  },
  "mock-venv": {
    command: process.execPath,
    args: [path.join(rootDir, "scripts", "safe_install_plan.js"), "--mock-venv"],
    description: "Create a mock Python venv marker under workspace."
  },
  "mock-install": {
    command: process.execPath,
    args: [path.join(rootDir, "scripts", "safe_install_plan.js"), "--mock-install"],
    description: "Write mock install log under workspace."
  },
  "mock-wait": {
    command: process.execPath,
    args: [path.join(rootDir, "scripts", "safe_install_plan.js"), "--mock-wait"],
    description: "Wait long enough to practise task cancellation."
  },
  "mock-failure": {
    command: process.execPath,
    args: [path.join(rootDir, "scripts", "safe_install_plan.js"), "--mock-failure"],
    description: "Create an incomplete artifact, fail, and verify cleanup."
  }
};

function listTasks() {
  return Object.entries(tasks).map(([taskId, task]) => ({
    taskId,
    description: task.description
  }));
}

function getTask(taskId) {
  return tasks[taskId] || null;
}

if (require.main === module) {
  console.log(JSON.stringify(listTasks(), null, 2));
}

module.exports = { getTask, listTasks };
