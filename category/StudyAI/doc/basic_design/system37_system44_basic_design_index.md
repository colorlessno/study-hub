# StudyAI system37-system44 基本設計インデックス

## 目的

企業AIシステムパターンを、StudyAI の共通アプリ構造で製造できる基本設計へ整理する。

## 共通構造

```text
backend/src/studyai/systems/enterprise_ai/
frontend/src/pages/EnterpriseAiSystemPage.tsx
scripts/enterprise_ai_demo.py
backend/tests/systems/test_enterprise_ai_systems.py
```

## 共通方針

- 既存の `system01` から `system36` は変更しない。
- `system37` から `system44` は業務実行、推薦、予測、検知、最適化、KPI評価の型を学ぶ教材とする。
- LM Studio 本体は Docker 化せず、既存方式どおりローカル起動し、Docker からは `host.docker.internal` 経由で接続する。
- 初期MVPは外部AIなしのモック・サンプルデータで成立させる。
- 作成・更新するテストファイルは UTF-8 BOMなしとする。

## 一覧

| No | ファイル | タイトル | 業務領域 | Backend配置 |
|---|---|---|---|---|
| system37 | `system37_basic_design.md` | 取引実行型AIコンシェルジュ | 予約・申込・注文 | `src/backend/src/studyai/systems/enterprise_ai/` |
| system38 | `system38_basic_design.md` | リアルタイム推薦・パーソナライズ | 推薦・ランキング | `src/backend/src/studyai/systems/enterprise_ai/` |
| system39 | `system39_basic_design.md` | 業務実行型カスタマーサポートAI | 問い合わせ・手続き | `src/backend/src/studyai/systems/enterprise_ai/` |
| system40 | `system40_basic_design.md` | 需要予測・在庫最適化AI | 需要予測・補充 | `src/backend/src/studyai/systems/enterprise_ai/` |
| system41 | `system41_basic_design.md` | コンピュータビジョン / マルチモーダルAI | 画像・現場AI | `src/backend/src/studyai/systems/enterprise_ai/` |
| system42 | `system42_basic_design.md` | 不正検知・異常検知AI | リスク検知 | `src/backend/src/studyai/systems/enterprise_ai/` |
| system43 | `system43_basic_design.md` | 制約最適化AI | 最適化・スケジューリング | `src/backend/src/studyai/systems/enterprise_ai/` |
| system44 | `system44_basic_design.md` | AI KPI / 実験評価ダッシュボード | AI評価・実験 | `src/backend/src/studyai/systems/enterprise_ai/` |

## 詳細設計で具体化すること

- request / response schema
- 状態遷移表
- 監査ログ項目
- KPI項目
- エラーコード
- Docker 実行方法と検証コマンド
