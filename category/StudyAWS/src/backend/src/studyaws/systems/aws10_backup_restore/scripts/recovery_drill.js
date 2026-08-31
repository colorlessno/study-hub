const fs = require("fs");
const path = require("path");

const mode = process.argv[2] || "restore";
const temporaryRootValue = process.env.STUDYAWS_BACKUP_ROOT;
if (!temporaryRootValue) {
  console.error("temporary_root_required");
  process.exit(1);
}

const root = path.resolve(temporaryRootValue);
const rootName = path.basename(root);
if (!/^(studyhub-command-|studyaws-backup-)/.test(rootName)) {
  console.error("unsafe_temporary_root");
  process.exit(1);
}

const originalPath = path.join(__dirname, "..", "data", "sample.json");
const dataDirectory = path.join(root, "data");
const backupDirectory = path.join(root, "backups");
const dataPath = path.join(dataDirectory, "sample.json");
const backupPath = path.join(backupDirectory, "sample-backup.json");
const original = fs.readFileSync(originalPath, "utf8");

fs.mkdirSync(dataDirectory, { recursive: true });
fs.mkdirSync(backupDirectory, { recursive: true });
fs.writeFileSync(dataPath, original, "utf8");

function createBackup() {
  fs.copyFileSync(dataPath, backupPath);
}

function changeData() {
  fs.writeFileSync(dataPath, '{"orders":[]}\n', "utf8");
}

function result(extra) {
  console.log(JSON.stringify({
    mode,
    temporaryOnly: true,
    source: "data/sample.json",
    backup: "backups/sample-backup.json",
    ...extra,
  }, null, 2));
}

if (mode === "backup") {
  createBackup();
  result({ backupExists: fs.existsSync(backupPath), backupMatchesSource: fs.readFileSync(backupPath, "utf8") === original });
} else if (mode === "dry-run") {
  createBackup();
  changeData();
  const changedBefore = fs.readFileSync(dataPath, "utf8");
  result({
    restoreExecuted: false,
    changedDataPreserved: fs.readFileSync(dataPath, "utf8") === changedBefore,
    backupDiffersFromCurrent: fs.readFileSync(backupPath, "utf8") !== changedBefore,
  });
} else if (mode === "restore") {
  createBackup();
  changeData();
  const changedBeforeRestore = fs.readFileSync(dataPath, "utf8") !== original;
  fs.copyFileSync(backupPath, dataPath);
  result({
    changedBeforeRestore,
    restoreExecuted: true,
    restoredMatchesBackup: fs.readFileSync(dataPath, "utf8") === fs.readFileSync(backupPath, "utf8"),
    restoredMatchesOriginal: fs.readFileSync(dataPath, "utf8") === original,
  });
} else if (mode === "missing-backup") {
  result({ restoreExecuted: false, backupExists: false, error: "no_backup_found" });
} else {
  console.error(`unknown_mode: ${mode}`);
  process.exitCode = 1;
}
