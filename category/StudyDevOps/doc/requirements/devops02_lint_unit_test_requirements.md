# devops02 要件定義

## lint / unit test

## 1. 目的

lint と unit test を分けて実行し、構文、静的品質、単体の振る舞いを段階的に確認する方法を学ぶ。

## 2. 学習対象

- lint、format、typecheck、unit test の違い
- npm scripts または Python task command の整理
- CI での品質ゲート
- Docker 内で lint / test を実行する考え方

## 3. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | lint 対象の小さいサンプルコードを用意する |
| FR-02 | unit test 対象の純粋関数を用意する |
| FR-03 | 正常系と異常系の unit test を用意する |
| FR-04 | lint failure と test failure を意図的に再現できるメモを作る |
| FR-05 | CI で lint と unit test を別 job または別 step として表現する |

## 4. 非機能要件

- 学習者がエラー原因をログから追える粒度にする。
- 外部サービス接続を不要にする。
- 作成するテキストファイルは UTF-8 BOMなしとする。

## 5. 対象外

- 大規模 lint rule の策定
- カバレッジ閾値の厳密適用
- E2E test

## 6. 成果物

```text
category/StudyDevOps/
  src/apps/devops02_lint_unit_test/
    package.json
    src/
    test/
    Dockerfile
  doc/learning_notes/devops02_lint_unit_test/
    README.md
    failure_examples.md
  doc/requirements/devops02_lint_unit_test_requirements.md
```

## 7. 受入条件

- lint と unit test を別々に実行できる。
- 失敗ログを見て、静的品質の失敗か振る舞いの失敗か判断できる。
- Docker 内でも同等のコマンドを実行できる。
