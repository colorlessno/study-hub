const fs = require("fs");
const path = require("path");

const root = process.env.STUDYAWS_STORAGE_ROOT
  ? path.resolve(process.env.STUDYAWS_STORAGE_ROOT)
  : path.join(__dirname, "..", "storage", "study-bucket");
const metadataDirectoryName = ".studyaws-metadata";

function objectPath(key) {
  if (typeof key !== "string" || key.length === 0 || path.isAbsolute(key)) {
    throw new Error("invalid_object_key");
  }
  const target = path.resolve(root, key);
  const relative = path.relative(root, target);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("invalid_object_key");
  }
  return target;
}

function metadataPath(key) {
  const relative = path.relative(root, objectPath(key));
  return path.join(root, metadataDirectoryName, `${relative}.json`);
}

function normalizeMetadata(metadata = {}) {
  const visibility = metadata.visibility || "private";
  if (!["private", "public"].includes(visibility)) throw new Error("invalid_visibility");
  return {
    contentType: metadata.contentType || "application/octet-stream",
    visibility,
  };
}

function upload(key, source, metadata = {}) {
  const target = objectPath(key);
  const storedMetadata = normalizeMetadata(metadata);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  const targetMetadata = metadataPath(key);
  fs.mkdirSync(path.dirname(targetMetadata), { recursive: true });
  fs.writeFileSync(targetMetadata, `${JSON.stringify(storedMetadata, null, 2)}\n`, "utf8");
  return { key, bytes: fs.statSync(target).size, metadata: storedMetadata };
}

function get(key) {
  const target = objectPath(key);
  const targetMetadata = metadataPath(key);
  return {
    key,
    content: fs.readFileSync(target, "utf8").trim(),
    metadata: JSON.parse(fs.readFileSync(targetMetadata, "utf8")),
  };
}

function list() {
  if (!fs.existsSync(root)) return [];
  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (dir === root && entry.name === metadataDirectoryName) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else results.push(path.relative(root, full).replaceAll("\\", "/"));
    }
  }
  walk(root);
  return results;
}

function remove(key) {
  const target = objectPath(key);
  const existed = fs.existsSync(target);
  if (existed) fs.rmSync(target);
  const targetMetadata = metadataPath(key);
  const metadataExisted = fs.existsSync(targetMetadata);
  if (metadataExisted) fs.rmSync(targetMetadata);
  return {
    key,
    existed,
    metadataExisted,
    existsAfterDelete: fs.existsSync(target),
    metadataExistsAfterDelete: fs.existsSync(targetMetadata),
  };
}

const sample = path.join(__dirname, "..", "samples", "sample.txt");
const operation = process.argv[2] || "save-read";

if (operation === "save-read") {
  const uploaded = upload("docs/sample.txt", sample, { contentType: "text/plain; charset=utf-8" });
  const downloaded = get(uploaded.key);
  console.log(JSON.stringify({ operation, uploaded, downloaded }, null, 2));
} else if (operation === "list-objects") {
  upload("docs/sample.txt", sample);
  upload("archive/sample-copy.txt", sample);
  console.log(JSON.stringify({ operation, keys: list() }, null, 2));
} else if (operation === "delete-object") {
  const uploaded = upload("docs/sample.txt", sample);
  const deleted = remove(uploaded.key);
  console.log(JSON.stringify({ operation, uploaded, deleted, remainingKeys: list() }, null, 2));
} else if (operation === "metadata-access") {
  const privateObject = upload("private/report.txt", sample, {
    contentType: "text/plain; charset=utf-8",
    visibility: "private",
  });
  const publicComparison = upload("comparison/public-report.txt", sample, {
    contentType: "text/plain; charset=utf-8",
    visibility: "public",
  });
  console.log(JSON.stringify({
    operation,
    privateObject: get(privateObject.key),
    publicComparison: get(publicComparison.key),
    recommendation: "private bucketを既定にし、一時共有には期限付きURLを使う",
  }, null, 2));
} else if (operation === "reject-unsafe-key") {
  const attempts = ["../secret.txt", "docs/../../secret.txt", path.resolve(root, "absolute.txt")]
    .map((key) => {
      try {
        objectPath(key);
        return { key, allowed: true };
      } catch (error) {
        return { key, allowed: false, reason: error.message };
      }
    });
  console.log(JSON.stringify({ operation, attempts }, null, 2));
} else {
  console.error(`unknown operation: ${operation}`);
  process.exitCode = 1;
}
