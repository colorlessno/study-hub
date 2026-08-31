# StudyAI system45-system48 要件定義インデックス

## 目的

PDFおよび追加テキストから抽出した、AIエージェント活用、AI実行基盤、AI説明、AI組織運用の追加候補を、後続工程へ進められる要件定義一覧として整理する。

## 共通方針

- 既存の `system01` から `system44` は変更しない。
- 外部AI APIなしでも学習できるよう、サンプル、模擬実行、固定入力データ、SQL、確認スクリプトを優先する。
- secrets、token、password、個人情報、実顧客情報を教材データに含めない。
- ローカルLLMは LM Studio の OpenAI互換APIを基本とし、未接続時は模擬実行に切り替える。
- 商用APIで代替する場合は、`AI_PROVIDER=commercial` または `AI_PROVIDER=custom` で OpenAI互換APIへ切り替える。
- 作成、更新するテキストファイルは UTF-8 BOMなしを原則とする。

## 一覧

| No | ファイル | テーマ | 目的 |
| --- | --- | --- | --- |
| system45 | `system45_agent_skill_packaging_requirements.md` | エージェント技能パッケージ化 | AIエージェントが再利用できる技能を、指示、参照資料、補助スクリプト、入出力契約として整理する。 |
| system46 | `system46_requirements.md` | AI実行基盤設計 | AIが安定して作業できる環境、入力、検証、権限、フィードバックを設計する。 |
| system48 | `system48_local_llm_agent_organization_requirements.md` | ローカルLLMによるAI組織運用 | ローカルLLMを使い、役割分担、タスクボード、共有文書、レビュー、承認境界でAI組織を運用する考え方を学ぶ。 |
| system47 | `system47_requirements.md` | 売上データ分析AIとBI説明 | SQL/BIによる正確な集計と、AIによる傾向説明、仮説提示の役割分担を学ぶ。 |

## 推奨順

```text
system45
  ↓
system46
  ↓
system48
  ↓
system47
```

`system48` は `system45` の技能化と `system46` の実行基盤設計を前提にすると理解しやすい。`system47` は業務データ分析寄りの教材であり、AI組織運用の後にレビュー担当や説明担当の応用例として扱える。

## 工程記録

- 2026-05-07 に `system45` から `system47` の基本設計を作成した。
- 2026-05-07 に `system45` から `system47` の詳細設計を作成した。
- 2026-05-07 に `system45` から `system47` の初期実装、学習メモを作成した。
- 2026-05-09 に `K1JBWvTIc2Y.txt` の内容を確認し、`system48` を追加候補として要件定義した。
- 製造では、外部AIなしで動く最小MVPを優先する。
