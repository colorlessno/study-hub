# devops02 基本設計

## lint / unit test

## 1. 設計目的

lint、typecheck、unit test を分けて実行し、静的品質と振る舞いの失敗を分析・分類できる教材にする。

## 2. 配置方針

```text
category/StudyDevOps/
  src/apps/devops02_lint_unit_test/
    package.json
    src/
      calculator.js
    test/
      calculator.test.js
    Dockerfile
  doc/learning_notes/devops02_lint_unit_test/
    README.md
    failure_examples.md
```

- 小さい JavaScript 関数を対象にする。
- lint failure と unit test failure を README の演習として扱う。
- 作成・更新するテキストファイルは UTF-8 BOMなしとする。

## 3. 全体フロー

```text
install -> lint -> unit test -> failure log review -> fix -> rerun
```

## 4. コンポーネント

| コンポーネント | 役割 |
|---|---|
| `src/calculator.js` | unit test 対象の純粋関数 |
| `test/calculator.test.js` | 正常系、異常系の test |
| `package.json` | `lint`, `test`, `check` scripts を定義する |
| `Dockerfile` | lint / test をコンテナ内で実行する |
| `doc/learning_notes/.../failure_examples.md` | lint failure と unit test failure の安全な再現・復旧手順 |

## 5. Docker / CI 方針

- Docker では `npm ci` 後に `npm run check` を実行する。
- CI では lint と unit test を別 step に分け、どちらで落ちたか分かるようにする。
- secrets は使わず、環境変数が必要な場合もダミー値のみ扱う。

## 6. 後続工程への引き継ぎ

詳細設計では、lint rule、test runner、scripts、失敗ログ例、Docker実行コマンドを定義する。
