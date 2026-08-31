# StudyAI system45-system48 基本設計インデックス

## 目的

`system45` から `system48` の要件定義を、詳細設計と教材実装へ渡せる基本設計として整理する。

## 共通方針

- 外部AI APIなしでも学べるように、固定入力、サンプル、模擬実行、固定入力データ、SQLを使う。
- AI判断と決定的検証を分ける。
- secrets、token、password、個人情報、実顧客情報を教材データに含めない。
- ローカルLLMは LM Studio を基本とし、未接続時は模擬実行に切り替える。
- 商用APIで代替する場合は、`AI_PROVIDER=commercial` または `AI_PROVIDER=custom` で OpenAI互換APIへ切り替える。
- 作成、更新するテキストファイルは UTF-8 BOMなしとする。

## 一覧

| No | 基本設計 | テーマ | 主な製造対象 |
| --- | --- | --- | --- |
| system45 | `system45_basic_design.md` | エージェント技能パッケージ化 | 技能構成、参照分離、補助スクリプト境界、失敗パターン |
| system46 | `system46_basic_design.md` | AI実行基盤設計 | 固定入力データ、決定的検査、承認境界、ログ |
| system48 | `system48_basic_design.md` | ローカルLLMによるAI組織運用 | ロール定義、タスクボード、共有記憶、判断ログ、レビュー、承認境界 |
| system47 | `system47_basic_design.md` | 売上データ分析AIとBI説明 | SQL集計、AI説明、読み取り専用境界、分析メモ |

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

`system48` は `system45` の技能化と `system46` の実行基盤設計を使い、複数ロールを文書で連携させる教材として扱う。

## 工程記録

- 2026-05-07 に `system45` から `system47` の詳細設計を作成した。
- 2026-05-07 に `system45` から `system47` の初期実装、学習メモを作成した。
- 2026-05-09 に `system48` の要件定義を作成した。
- 2026-05-09 に `system48` の基本設計を作成した。
