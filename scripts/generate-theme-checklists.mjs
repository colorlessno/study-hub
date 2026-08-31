import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const catalogPath = path.join(repositoryRoot, 'catalog', 'themes.json');
const checklistDirectory = path.join(repositoryRoot, 'catalog', 'checklists');
const writeFiles = process.argv.includes('--write');
const force = process.argv.includes('--force');

const preferredSections = [
  /^学習完了の目安$/u,
  /完了条件/u,
  /受入条件/u,
  /^確認ポイント$/u,
  /到達目標/u,
  /できるようになること/u,
  /身につけること/u,
  /このテーマで学ぶこと/u,
  /^学習する境界$/u,
  /^観察ポイント$/u,
  /^確認項目$/u,
  /^対応する知識マップ項目$/u,
  /^学習経路$/u,
  /^IdeaForge$/u
];

function readUtf8(filePath) {
  const bytes = fs.readFileSync(filePath);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function normalizeHeading(value) {
  return value
    .replace(/[`*_]/gu, '')
    .replace(/^\d+[.)．]\s*/u, '')
    .trim();
}

function cleanItem(value) {
  return value
    .replace(/^\[[ xX]\]\s*/u, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function splitSections(markdown) {
  const sections = [];
  let current;
  let inCodeBlock = false;

  for (const line of markdown.split(/\r?\n/u)) {
    if (/^\s*```/u.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    const heading = line.match(/^(#{1,6})\s+(.+)$/u);
    if (heading) {
      current = {
        level: heading[1].length,
        title: normalizeHeading(heading[2]),
        lines: []
      };
      sections.push(current);
      continue;
    }
    current?.lines.push(line);
  }
  return sections;
}

function listItems(lines) {
  return lines
    .map((line) => line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.+)$/u)?.[1])
    .filter((item) => item !== undefined)
    .map(cleanItem)
    .filter(Boolean);
}

function paragraphItems(lines) {
  const items = [];
  let paragraph = [];
  const flush = () => {
    if (paragraph.length > 0) items.push(cleanItem(paragraph.join(' ')));
    paragraph = [];
  };

  for (const line of lines) {
    const value = line.trim();
    if (!value || /^\|?\s*:?-+/u.test(value) || value.startsWith('|')) {
      flush();
      continue;
    }
    paragraph.push(value);
  }
  flush();
  return items.filter(Boolean);
}

function tableItems(lines) {
  return lines
    .filter((line) => line.trim().startsWith('|') && line.trim().endsWith('|'))
    .map((line) => line.trim().slice(1, -1).split('|').map((cell) => cleanItem(cell)))
    .filter((cells) => cells.length > 1)
    .filter((cells) => !cells.every((cell) => /^:?-+:?$/u.test(cell)))
    .slice(1)
    .map((cells) => `${cells[0]}：${cells.slice(1).join(' / ')}`);
}

function uniqueItems(items) {
  return [...new Set(items)].slice(0, 12);
}

function checklistItems(markdown, theme) {
  const sections = splitSections(markdown);
  for (const matcher of preferredSections) {
    for (const section of sections.filter((item) => matcher.test(item.title))) {
      const items = uniqueItems(listItems(section.lines));
      if (items.length > 0) return { source: section.title, items };
      const tables = uniqueItems(tableItems(section.lines));
      if (tables.length > 0) return { source: section.title, items: tables };
      const paragraphs = uniqueItems(paragraphItems(section.lines));
      if (paragraphs.length > 0) return { source: section.title, items: paragraphs };
    }
  }
  return {
    source: 'テーマ情報',
    items: [`「${theme.name}」の説明文書を読み、教材の内容と確認方法を把握した`]
  };
}

const catalog = JSON.parse(readUtf8(catalogPath));
const reports = [];
let createdCount = 0;
let skippedCount = 0;

fs.mkdirSync(checklistDirectory, { recursive: true });
for (const theme of catalog.themes) {
  const outputPath = path.join(checklistDirectory, `${theme.id}_check.json`);
  if (!force && fs.existsSync(outputPath)) {
    skippedCount += 1;
    continue;
  }
  const markdownPath = path.resolve(repositoryRoot, theme.entryFile);
  if (!markdownPath.startsWith(`${repositoryRoot}${path.sep}`) || !fs.existsSync(markdownPath)) {
    throw new Error(`テーマ文書を確認できません: ${theme.id} ${theme.entryFile}`);
  }
  const selected = checklistItems(readUtf8(markdownPath), theme);
  const checklist = {
    schemaVersion: 1,
    revision: 1,
    themeId: theme.id,
    title: '学習項目',
    items: selected.items.map((label, index) => ({
      id: `check-${String(index + 1).padStart(2, '0')}`,
      label
    }))
  };
  reports.push(`${theme.id}\t${selected.source}\t${checklist.items.length}`);
  if (writeFiles) {
    fs.writeFileSync(outputPath, `${JSON.stringify(checklist, null, 2)}\n`, { encoding: 'utf8' });
    createdCount += 1;
  }
}

for (const report of reports) console.log(report);
console.log(`対象: ${catalog.themes.length}`);
console.log(`既存のため維持: ${skippedCount}`);
console.log(writeFiles ? `生成: ${createdCount}` : `生成予定: ${reports.length}`);
if (!writeFiles) console.log('書き込む場合は --write を指定してください。');
