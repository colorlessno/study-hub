# package.json読解メモ

| 項目 | 内容 |
|---|---|
| `scripts.dev` | `src/index.js`へ`--mode=dev`を渡して1回実行する |
| `scripts.build` | `node --check`で`src/index.js`の構文を確認する |
| `scripts.test` | `test/smoke.test.js`を実行する |
| `scripts.start` | `src/index.js`を通常モードで1回実行する |

このサンプルには`dependencies`と`devDependencies`がないため、実行前の`npm install`は不要です。
