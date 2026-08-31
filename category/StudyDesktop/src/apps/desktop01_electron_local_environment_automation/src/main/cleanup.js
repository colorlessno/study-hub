const fs = require("fs");
const path = require("path");

const workspaceDir = path.resolve(__dirname, "../..", "workspace");

function assertInsideWorkspace(targetPath) {
  const resolved = path.resolve(targetPath);
  if (!resolved.startsWith(workspaceDir + path.sep) && resolved !== workspaceDir) {
    throw new Error(`Refusing to clean outside workspace: ${resolved}`);
  }
  return resolved;
}

function cleanupRun(runId) {
  const runDir = assertInsideWorkspace(path.join(workspaceDir, runId));
  if (fs.existsSync(runDir)) {
    fs.rmSync(runDir, { recursive: true, force: true });
    return { cleaned: true, path: path.relative(workspaceDir, runDir) };
  }
  return { cleaned: false, path: path.relative(workspaceDir, runDir) };
}

module.exports = { cleanupRun, workspaceDir };

