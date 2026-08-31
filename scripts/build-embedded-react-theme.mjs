import path from 'node:path';
import process from 'node:process';
import { build } from '../app/node_modules/esbuild/lib/main.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..');
const studyWebRoot = path.join(workspaceRoot, 'category', 'StudyWeb');
const themeRoot = path.resolve(workspaceRoot, process.argv[2] ?? '');

if (!themeRoot.startsWith(`${studyWebRoot}${path.sep}`)) {
  throw new Error('StudyWeb配下のテーマを指定してください。');
}

await build({
  absWorkingDir: themeRoot,
  entryPoints: ['app/src/main.jsx'],
  bundle: true,
  format: 'iife',
  outfile: 'app/bundle/main.js',
  nodePaths: [path.join(workspaceRoot, 'app', 'node_modules')]
});

console.log(`${path.relative(workspaceRoot, themeRoot)}: app/bundle/main.js を生成しました。`);
