import fs from 'node:fs';
import path from 'node:path';
import { TextDecoder } from 'node:util';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const catalogPath = path.join(repositoryRoot, 'catalog', 'themes.json');
const checklistRoot = path.join(repositoryRoot, 'catalog', 'checklists');
const writeChanges = process.argv.includes('--write');
const quiet = process.argv.includes('--quiet');
const previewThemeId = process.argv.find((argument) => argument.startsWith('--preview='))?.slice('--preview='.length);
const decoder = new TextDecoder('utf-8', { fatal: true });

function readUtf8(filePath) {
  const buffer = fs.readFileSync(filePath);
  const hasBom = buffer.length >= 3
    && buffer[0] === 0xef
    && buffer[1] === 0xbb
    && buffer[2] === 0xbf;
  const text = decoder.decode(buffer);
  const crlfCount = (text.match(/\r\n/g) ?? []).length;
  const lfCount = (text.match(/(?<!\r)\n/g) ?? []).length;
  return {
    text,
    hasBom,
    eol: crlfCount > lfCount ? '\r\n' : '\n'
  };
}

function writeUtf8(filePath, text, hasBom) {
  const output = `${hasBom ? '\ufeff' : ''}${text}`;
  fs.writeFileSync(filePath, output, { encoding: 'utf8' });
}

function withoutFinalPeriod(text) {
  return text.trim().replace(/[。.]$/, '');
}

function goalFromChecklist(label) {
  let goal = withoutFinalPeriod(label);
  const completionIndex = goal.indexOf('完了です');
  if (completionIndex >= 0) {
    goal = goal.slice(0, completionIndex + '完了です'.length).split('。').at(-1).trim();
  }
  goal = goal
    .replace(/^レベル\d+（[^）]+）:\s*/, '')
    .replace(/できれば完了です$/, 'できる')
    .replace(/作れれば完了です$/, '作れる')
    .replace(/示せれば完了です$/, '示せる')
    .replace(/残せれば完了です$/, '残せる')
    .replace(/なれば完了です$/, 'にできる')
    .replace(/確認します$/, '確認できる')
    .replace(/確認した$/, '確認できる')
    .replace(/実行した$/, '実行できる')
    .replace(/記録した$/, '記録できる')
    .replace(/作成した$/, '作成できる')
    .replace(/比較した$/, '比較できる')
    .replace(/整理した$/, '整理できる')
    .replace(/分類した$/, '分類できる')
    .replace(/照合した$/, '照合できる')
    .replace(/検証した$/, '検証できる')
    .replace(/操作した$/, '操作できる')
    .replace(/入力した$/, '入力できる')
    .replace(/送信した$/, '送信できる')
    .replace(/保存した$/, '保存できる')
    .replace(/起動した$/, '起動できる')
    .replace(/停止した$/, '停止できる')
    .replace(/復旧した$/, '復旧できる')
    .replace(/取得した$/, '取得できる')
    .replace(/呼び出した$/, '呼び出せる')
    .replace(/再読み込みした$/, '再読み込みできる')
    .replace(/表示した$/, '表示できる')
    .replace(/記載した$/, '記載できる')
    .replace(/指定した$/, '指定できる')
    .replace(/説明した$/, '説明できる')
    .replace(/後片付けした$/, '後片付けできる')
    .replace(/記入した$/, '記入できる')
    .replace(/提案した$/, '提案できる')
    .replace(/制限した$/, '制限できる')
    .replace(/評価した$/, '評価できる')
    .replace(/開いた$/, '開ける')
    .replace(/残した$/, '残せる')
    .replace(/戻した$/, '戻せる')
    .replace(/変更した$/, '変更できる')
    .replace(/追加した$/, '追加できる')
    .replace(/適用した$/, '適用できる')
    .replace(/成功した$/, '成功させられる');

  const processMatch = goal.match(/^工程\d+：([^：]+)：(.+)$/);
  if (processMatch) {
    goal = `${processMatch[1]}で扱う「${processMatch[2]}」を説明できる`;
  } else if (goal.startsWith('横断：')) {
    goal = `${goal.slice('横断：'.length)}を横断的に使う構成を説明できる`;
  }
  return goal;
}

function sectionRange(text, headings) {
  for (const heading of headings) {
    const pattern = new RegExp(`^## ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
    const match = pattern.exec(text);
    if (!match) continue;
    const nextHeading = /^## /m;
    nextHeading.lastIndex = match.index + match[0].length;
    const remainder = text.slice(match.index + match[0].length);
    const nextMatch = nextHeading.exec(remainder);
    const end = nextMatch
      ? match.index + match[0].length + nextMatch.index
      : text.length;
    return { start: match.index, end };
  }
  return undefined;
}

function renderSection(heading, lines, eol, checkbox) {
  const bullets = lines.map((line) => `${checkbox ? '- [ ]' : '-'} ${line}`).join(eol);
  return `## ${heading}${eol}${eol}${bullets}${eol}${eol}`;
}

function replaceOrInsertSection(text, headings, rendered, eol, insertAtEnd = false) {
  const range = sectionRange(text, headings);
  if (range) {
    return `${text.slice(0, range.start)}${rendered}${text.slice(range.end).replace(/^\s*/, '')}`;
  }
  if (insertAtEnd) {
    const separator = /(?:\r\n|\n){2}$/.test(text)
      ? ''
      : /(?:\r\n|\n)$/.test(text) ? '\n' : '\n\n';
    return `${text}${separator}${rendered}`;
  }
  const firstLevelTwo = /^## /m.exec(text);
  if (firstLevelTwo) {
    return `${text.slice(0, firstLevelTwo.index)}${rendered}${text.slice(firstLevelTwo.index)}`;
  }
  return `${text}${text.endsWith('\n') ? '\n' : '\n\n'}${rendered}`;
}

const catalog = JSON.parse(readUtf8(catalogPath).text);
const changed = [];
const reviewGoals = [];

for (const theme of catalog.themes) {
  const documentPath = path.join(repositoryRoot, theme.entryFile);
  const checklistPath = path.join(checklistRoot, `${theme.id}_check.json`);
  const document = readUtf8(documentPath);
  const checklist = JSON.parse(readUtf8(checklistPath).text);
  const labels = checklist.items.map((item) => item.label.trim());
  if (labels.length === 0) throw new Error(`チェック項目がありません: ${theme.id}`);

  const goals = labels.map(goalFromChecklist);
  goals.forEach((goal, index) => {
    if (/(した|です|ます)$/.test(goal)) {
      reviewGoals.push(`${theme.id}/${checklist.items[index].id}: ${goal}`);
    }
  });
  let next = replaceOrInsertSection(
    document.text,
    ['このテーマでできるようになること', 'このテーマで学ぶこと'],
    renderSection('このテーマでできるようになること', goals, '\n', false),
    '\n'
  );
  next = next.replace(/\r\n\r\n(?=## このテーマでできるようになること)/g, '\n\n');
  next = next.replace(/(?:\r?\n)+$/, '\n');

  if (next !== document.text) {
    changed.push(path.relative(repositoryRoot, documentPath));
    if (previewThemeId === theme.id) console.log(next);
    if (writeChanges) writeUtf8(documentPath, next, document.hasBom);
  }
}

console.log(`${writeChanges ? '更新対象' : '差分対象'}: ${changed.length}件`);
if (!quiet) for (const filePath of changed) console.log(filePath);
if (reviewGoals.length > 0) {
  console.log(`要確認の学習目標: ${reviewGoals.length}件`);
  for (const goal of reviewGoals) console.log(goal);
}
