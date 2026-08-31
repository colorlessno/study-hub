const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { assertReadOnlySql } = require("../checks/readonly_sql_check.js");

const sqlFiles = {
  monthly: "monthly_sales.sql",
  product: "product_sales.sql",
  customer: "customer_sales.sql"
};

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

function normalizeValue(value) {
  return /^-?\d+(?:\.\d+)?$/u.test(value) ? Number(value) : value;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/u).filter(Boolean);
  if (lines.length < 2) throw new Error("SQL集計結果に見出しまたはデータ行がありません。");
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => Object.fromEntries(
    parseCsvLine(line).map((value, index) => [headers[index], normalizeValue(value)])
  ));
}

function runAggregation(mode) {
  const sqlFile = sqlFiles[mode];
  if (!sqlFile) {
    throw new Error("集計種別はmonthly、product、customerのいずれかを指定してください。");
  }

  const sqlPath = path.resolve(__dirname, "..", "sql", sqlFile);
  const sql = fs.readFileSync(sqlPath, "utf8");
  assertReadOnlySql(sql);

  const command = spawnSync(
    "docker",
    [
      "compose", "-p", "studyhub-system47", "exec", "-T", "db",
      "psql", "--no-psqlrc", "--quiet", "--csv", "--set", "ON_ERROR_STOP=1",
      "-U", "system47", "-d", "system47", "--file", "-"
    ],
    { cwd: path.resolve(__dirname, ".."), input: sql, encoding: "utf8" }
  );

  if (command.error) throw new Error(`DockerからPostgreSQLを実行できません: ${command.error.message}`);
  if (command.status !== 0) {
    const detail = command.stderr.trim() || command.stdout.trim() || `終了コード: ${command.status}`;
    throw new Error(`PostgreSQLの${mode}集計に失敗しました: ${detail}`);
  }

  return {
    mode,
    source: `sql/${sqlFile}`,
    result: parseCsv(command.stdout)
  };
}

if (require.main === module) {
  try {
    console.log(JSON.stringify(runAggregation(process.argv[2]), null, 2));
  } catch (error) {
    console.error(`[system47] ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { parseCsv, runAggregation };
