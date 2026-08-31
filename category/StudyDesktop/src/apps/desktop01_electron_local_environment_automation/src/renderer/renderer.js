let currentRunId = null;

const taskSelect = document.getElementById("task");
const startButton = document.getElementById("start");
const cancelButton = document.getElementById("cancel");
const status = document.getElementById("status");
const log = document.getElementById("log");

function appendLog(item) {
  status.textContent = item.type;
  log.textContent += `[${item.timestamp}] ${item.level} ${item.type}: ${item.message}\n`;
}

async function init() {
  const tasks = await window.desktop01.listTasks();
  for (const task of tasks) {
    const option = document.createElement("option");
    option.value = task.taskId;
    option.textContent = `${task.taskId} - ${task.description}`;
    taskSelect.appendChild(option);
  }
  window.desktop01.onTaskEvent(appendLog);
}

startButton.addEventListener("click", async () => {
  const result = await window.desktop01.startTask(taskSelect.value);
  currentRunId = result.runId;
});

cancelButton.addEventListener("click", async () => {
  if (currentRunId) {
    await window.desktop01.cancelTask(currentRunId);
  }
});

init();

