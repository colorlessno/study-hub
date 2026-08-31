const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop01", {
  listTasks: () => ipcRenderer.invoke("task:list"),
  startTask: (taskId) => ipcRenderer.invoke("task:start", { taskId }),
  cancelTask: (runId) => ipcRenderer.invoke("task:cancel", { runId }),
  onTaskEvent: (handler) => ipcRenderer.on("task:event", (_event, payload) => handler(payload))
});

