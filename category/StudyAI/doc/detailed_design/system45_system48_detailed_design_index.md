# StudyAI system45-system48 詳細設計インデックス

## 目的

`system45` から `system48` の基本設計を、教材実装と学習メモへ渡せる具体設計へ落とす。

## 共通方針

- 外部AI APIなしでも学べるように、固定入力、サンプル、模擬実行、固定入力データ、SQLを使う。
- AI判断と決定的検証を分ける。
- secrets、token、password、個人情報、実顧客情報を教材データに含めない。
- ローカルLLMは LM Studio を基本とし、未接続時は模擬実行に切り替える。
- 商用APIで代替する場合は、`AI_PROVIDER=commercial` または `AI_PROVIDER=custom` で OpenAI互換APIへ切り替える。
- 作成、更新するテキストファイルは UTF-8 BOMなしとする。

## 一覧

| No | 詳細設計 | テーマ | 主な製造対象 |
| --- | --- | --- | --- |
| system45 | `system45_detailed_design.md` | エージェント技能パッケージ化 | サンプル技能、契約、参照資料、補助スクリプト、失敗パターン |
| system46 | `system46_detailed_design.md` | AI実行基盤設計 | 固定入力データ、確認スクリプト、承認境界、実行ログ |
| system48 | `system48_detailed_design.md` | ローカルLLMによるAI組織運用 | ロール定義、タスクボード、共有記憶、判断ログ、レビュー、QA、安全確認 |
| system47 | `system47_detailed_design.md` | 売上データ分析AIとBI説明 | 売上サンプル、SQL集計、AI説明入力、読み取り専用境界 |

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

`system48` は `system45` の技能化と `system46` の実行基盤設計を前提に、AI組織運用のロール分担、文書連携、承認境界を具体化する。

## 工程記録

- 2026-05-07 に `system45` から `system47` の初期実装、学習メモを作成した。
- 2026-05-09 に `system48` の要件定義を作成した。
- 2026-05-09 に `system48` の基本設計を作成した。
- 2026-05-09 に `system48` の詳細設計を作成した。
