# system46 要件定義

## このテーマでできるようになること

- harness がプロンプト単体と違う理由を説明できる
- fixture、check、approval、log の役割を説明できる
- AI作業を再実行可能にするための要素を列挙できる

## AI harness engineering

## 1. 目的

AIが安定して作業できる環境、入力、検証、権限、フィードバックを設計する AI harness engineering を学ぶ。

## 2. 学習対象

- harness の役割
- sandbox
- fixture
- deterministic check
- evaluation gate
- tool permission
- reproducible run
- feedback loop

## 3. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | AI作業に必要な入力、制約、許可操作を定義する |
| FR-02 | サンプル入力と期待出力を fixture として用意する |
| FR-03 | 実行結果を検証する deterministic check を用意する |
| FR-04 | 危険操作に対する approval boundary を定義する |
| FR-05 | 実行ログ、失敗理由、再実行条件を記録する |

## 4. 非機能要件

- AIの出力品質だけでなく、再現性と検証可能性を重視する。
- 実秘密情報、実顧客データ、破壊的操作を扱わない。
- 作成するテキストファイルは UTF-8 BOMなしとする。

## 5. 対象外

- 本番LLMOps基盤の構築
- 大規模評価基盤
- 外部AI API課金を伴う検証

## 6. 成果物

```text
category/StudyAI/
  doc/requirements/system46_requirements.md
  doc/basic_design/system46_basic_design.md
  doc/detailed_design/system46_detailed_design.md
  doc/learning_notes/system46_ai_harness_engineering/
  src/apps/system46_ai_harness_engineering/
```

## 7. 受入条件

- harness がプロンプト単体と違う理由を説明できる。
- fixture、check、approval、log の役割を説明できる。
- AI作業を再実行可能にするための要素を列挙できる。
