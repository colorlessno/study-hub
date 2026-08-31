const path = require("path");
const { app, BrowserWindow, ipcMain } = require("electron");
const { listTasks } = require("./commandAllowlist");
const { startTask, cancelTask } = require("./taskRunner");

app.disableHardwareAcceleration();
app.setPath("userData", path.join(__dirname, "../../workspace/electron-profile"));

function createWindow() {
  const win = new BrowserWindow({
    width: 920,
    height: 620,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js")
    }
  });

  win.webContents.on("did-fail-load", (_event, code, description) => {
    console.error(`[desktop01] Renderer load failed: ${code} ${description}`);
  });

  ipcMain.handle("task:list", () => listTasks());
  ipcMain.handle("task:start", (_event, payload) => startTask(payload.taskId, (item) => win.webContents.send("task:event", item)));
  ipcMain.handle("task:cancel", (_event, payload) => cancelTask(payload.runId, (item) => win.webContents.send("task:event", item)));

  void win.loadFile(path.join(__dirname, "../renderer/index.html"))
    .then(() => {
      console.log("[desktop01] Electron window is ready.");
    })
    .catch((error) => {
      console.error(`[desktop01] Renderer load failed: ${error.message}`);
    });
}

app.whenReady().then(createWindow);
