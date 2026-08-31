const allowed = new Set([".csv", ".txt", ".pdf"]);
const maxBytes = 1024 * 1024;
const examples = {
  allowed: { name: "sample.csv", size: 1000 },
  extension: { name: "sample.exe", size: 1000 },
  "too-large": { name: "sample.pdf", size: 1048577 },
  negative: { name: "sample.txt", size: -1 },
  uppercase: { name: "REPORT.PDF", size: 4096 },
};

const example = document.getElementById("example");
const nameInput = document.getElementById("name");
const sizeInput = document.getElementById("size");
const result = document.getElementById("result");

example.addEventListener("change", () => {
  const selected = examples[example.value];
  nameInput.value = selected.name;
  sizeInput.value = String(selected.size);
  result.textContent = "入力を変更しました。検証を実行してください。";
});

document.getElementById("check").addEventListener("click", () => {
  const name = nameInput.value;
  const size = Number(sizeInput.value);
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")).toLowerCase() : "";
  const errors = [];
  if (!allowed.has(ext)) errors.push("extension_not_allowed");
  if (!Number.isFinite(size) || size < 0) errors.push("invalid_size");
  else if (size > maxBytes) errors.push("size_exceeded");
  result.textContent = JSON.stringify({ name, size, ext, accepted: errors.length === 0, errors }, null, 2);
});
