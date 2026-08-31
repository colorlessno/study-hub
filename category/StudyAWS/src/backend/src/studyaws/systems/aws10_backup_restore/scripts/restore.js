const fs = require("fs");
const path = require("path");
const root = path.resolve(process.env.STUDYAWS_BACKUP_ROOT || path.join(__dirname, ".."));
const backupDir = path.join(root, "backups");
const target = path.join(root, "data", "sample.json");
const dryRun = process.argv.includes("--dry-run");

const backups = fs.existsSync(backupDir)
  ? fs.readdirSync(backupDir).filter((name) => name.endsWith(".json")).sort()
  : [];
const latest = backups.at(-1);
if (!latest) {
  console.error("no_backup_found");
  process.exitCode = 1;
} else {
  const source = path.join(backupDir, latest);
  console.log(JSON.stringify({ source: path.relative(root, source), target: path.relative(root, target), dryRun }));
  if (!dryRun) fs.copyFileSync(source, target);
}
