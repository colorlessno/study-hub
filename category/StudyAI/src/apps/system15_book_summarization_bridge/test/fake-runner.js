import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const bookId = args[args.indexOf('--book_id') + 1];
const cliRoot = process.cwd();
const summaryDirectory = path.join(cliRoot, 'sections_summary', bookId);
mkdirSync(summaryDirectory, { recursive: true });
writeFileSync(path.join(summaryDirectory, '01-introduction.md'), '# はじめに\n\n実際のCLIプロセスが保存したテスト要約です。\n', 'utf8');
console.log('[fake-cli] pipeline completed');
