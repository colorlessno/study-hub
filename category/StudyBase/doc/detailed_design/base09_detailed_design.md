# base09 npm scripts 詳細設計
## 0. 関連文書

- `../requirements/base09_npm_scripts_requirements.md`
- `../basic_design/base09_basic_design.md`

## 1. 製造対象

```text
doc/learning_notes/base09_npm_scripts/
  README.md
  notes/
src/samples/base09_npm_scripts/
  sample_node_project/
```
## 2. ファイル設計
| ファイル | 内容 |
|---|---|
| `package.json` | `dev`、`build`、`test`、`start` scripts |
| `src/index.js` | 小さいNode.js 実行ファイル |
| `test/smoke.test.js` | 最小のテスト例 |
| `package_json_reading_note.md` | scripts と依存関係の読解 |
| `npm_command_log.md` | 実行コマンドと結果 |
| `npm_error_note.md` | 失敗例と対処 |

## 3. script 設計
| script | 目的 |
|---|---|
| `dev` | 開発用に実行する |
| `build` | 構文確認相当の処理を行う |
| `test` | 最小テストを実行する |
| `start` | 通常実行する |

## 4. 確認手順
1. `package.json` の scripts を読む
2. `npm run dev`、`npm run build`、`npm test`、`npm start`を個別に実行する
3. `npm --logs-max=0 run missing-script`で存在しないscriptを指定し、ホスト固有のログパスを作成・表示せず`Missing script`エラーを確認する
4. 各結果と、確認できていない範囲を説明する

## 5. 完了条件

- サンプル Node.js プロジェクトの構成が定義されている
- scriptsの目的と結果を対応付けられる
- `build`と`test`が確認する範囲の違いを説明できる
