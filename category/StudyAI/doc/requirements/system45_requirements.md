# system45 要件定義

## このテーマでできるようになること

- skill と tool calling の違いを説明できる
- skill 定義に必要な項目を説明できる
- 参照資料とスクリプトを分ける理由を説明できる

## Agent skill packaging

## 1. 目的

AIエージェントが再利用できる skill を、指示、メタデータ、参照資料、補助スクリプト、入出力契約としてパッケージ化する方法を学ぶ。

## 2. 学習対象

- skill の役割
- skill metadata
- instruction file
- references
- scripts / tools
- progressive disclosure
- input / output contract
- failure pattern

## 3. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | 最小 skill 定義ファイルを作る |
| FR-02 | skill の目的、入力、出力、制約を明記する |
| FR-03 | 長い説明を references に分離する例を作る |
| FR-04 | 決定的処理を script/tool に逃がす例を作る |
| FR-05 | 入力不足、権限不足、危険操作時の失敗パターンを記録する |

## 4. 非機能要件

- skill はモデルに丸投げする指示ではなく、作業境界を明確にする。
- 実際のsecrets、token、password、個人情報を含めない。拒否動作の確認にはダミー値だけを使用する。
- 作成するテキストファイルは UTF-8 BOMなしとする。

## 5. 対象外

- 特定ベンダーのSkill仕様への完全準拠
- marketplace公開
- 実外部サービス操作

## 6. 成果物

```text
category/StudyAI/
  doc/requirements/system45_requirements.md
  doc/basic_design/system45_basic_design.md
  doc/detailed_design/system45_detailed_design.md
  doc/learning_notes/system45_agent_skill_packaging/
  src/apps/system45_agent_skill_packaging/sample_skill/
```

## 7. 受入条件

- skill と tool calling の違いを説明できる。
- skill 定義に必要な項目を説明できる。
- 参照資料とスクリプトを分ける理由を説明できる。
