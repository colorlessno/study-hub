const fs = require("fs");
const path = require("path");
const root = path.resolve(process.env.STUDYAWS_BACKUP_ROOT || path.join(__dirname, ".."));
const source = path.join(root, "data", "sample.json");
const backupDir = path.join(root, "backups");
if (process.env.STUDYAWS_BACKUP_ROOT) {
  fs.mkdirSync(path.dirname(source), { recursive: true });
  fs.copyFileSync(path.join(__dirname, "..", "data", "sample.json"), source);
}
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = path.join(backupDir, `sample-${stamp}.json`);
fs.copyFileSync(source, target);
console.log(JSON.stringify({ backup: path.relative(root, target) }));
