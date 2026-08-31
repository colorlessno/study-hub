# base09 npm scripts 要件定義

## 1. 目的

`package.json`とnpm scriptsを読み、開発用実行、構文確認、テスト、通常実行を自分で選び、実行結果を説明できるようにする。

## 2. 学習対象

- `package.json`
- `scripts`
- `npm run dev`
- `npm run build`
- `npm run test`
- `npm start`
- 実行エラーの読み方

## 3. 作成する成果物

- npm scripts練習用プロジェクト
- `package.json` 読解メモ
- script 実行手順
- 成功時と失敗時のログ例
- よくあるエラーと対処メモ

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | `package.json` の主要項目を説明できる |
| FR-02 | `npm run dev`で開発用モードの実行結果を確認できる |
| FR-03 | `npm run build`でJavaScriptの構文を確認できる |
| FR-04 | `npm test`で最小テストを実行できる |
| FR-05 | `npm start`で通常実行の結果を確認できる |
| FR-06 | 存在しないscriptのエラーから`package.json`を確認すべきことを判断できる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | Windowsのコマンドプロンプトと`rtk`で実行できる |
| NFR-02 | 既存 StudyWeb の npm プロジェクト読解へ接続できる |
| NFR-03 | 依存関係の追加は必要最小限にする |

## 6. 対象外

- npm package 公開
- monorepo 管理
- pnpm / yarn の深掘り
- CI/CD 実装

## 7. 受入条件

- `package.json` の scripts を読んで実行内容を説明できる
- dev / build / test / startの違いを説明できる
- npm 実行ログから失敗箇所を探せる
- 各scriptが確認する範囲と、確認しない範囲を説明できる

## 8. 学習観点

- `npm run` は `package.json` の scripts を実行している
- 起動しないときは script、依存関係、ポート、環境変数を切り分ける
- ログを残すと再現と質問がしやすくなる
