const fs = require("fs");
const path = require("path");

const samplesDir = process.argv[2];
const roleCatalogPath = process.argv[3]
  ?? path.resolve(__dirname, "..", "fixtures", "role_catalog.json");

if (!samplesDir) {
  console.error("Usage: node checks/check_role_outputs.js <samples-dir>");
  process.exit(2);
}

const roleCatalog = JSON.parse(fs.readFileSync(path.resolve(roleCatalogPath), "utf8"));
const requiredSections = Object.fromEntries(roleCatalog.roles.map((role) => [
  role.output.file,
  role.output.headings.map((heading) => `## ${heading}`)
]));

const unresolvedMarkerPatterns = [
  /^(?:[-*]\s*)?(?:TODO|TBD)(?:\s*[:：].*)?$/i,
  /^(?:[-*]\s*)?(?:未定|あとで)(?:\s*[:：].*)?$/
];

for (const [fileName, sections] of Object.entries(requiredSections)) {
  const filePath = path.resolve(samplesDir, fileName);
  if (!fs.existsSync(filePath)) {
    console.error(`missing output: ${fileName}`);
    process.exit(1);
  }

  const text = fs.readFileSync(filePath, "utf8");
  const missing = sections.filter((section) => !text.includes(section));
  if (missing.length > 0) {
    console.error(`${fileName} missing sections: ${missing.join(", ")}`);
    process.exit(1);
  }

  const hasUnresolved = text
    .split(/\r?\n/)
    .some((line) => unresolvedMarkerPatterns.some((pattern) => pattern.test(line.trim())));
  if (hasUnresolved) {
    console.error(`${fileName} contains unresolved marker`);
    process.exit(1);
  }

  for (const section of sections) {
    const index = text.indexOf(section);
    const next = sections
      .map((candidate) => text.indexOf(candidate, index + section.length))
      .filter((candidateIndex) => candidateIndex > index)
      .sort((a, b) => a - b)[0];
    const body = text.slice(index + section.length, next || text.length).trim();
    if (body.length === 0) {
      console.error(`${fileName} has empty section: ${section}`);
      process.exit(1);
    }
  }
}

const taskBoardPath = path.resolve(samplesDir, "task_board.json");
if (fs.existsSync(taskBoardPath)) {
  const taskBoard = JSON.parse(fs.readFileSync(taskBoardPath, "utf8"));
  const reflectedRoles = taskBoard.review_reflection?.downstream_roles ?? [];
  for (const roleId of reflectedRoles) {
    const role = roleCatalog.roles.find((item) => item.id === roleId);
    if (!role || !fs.existsSync(path.resolve(samplesDir, role.output.file))) {
      console.error(`review reflection output is missing for role: ${roleId}`);
      process.exit(1);
    }
  }
}

console.log(`role outputs check passed: ${samplesDir}`);
