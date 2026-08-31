# StudyAI system37-system44 詳細設計インデックス

## 目的
企業AIシステムパターンを、StudyAI の共通 enterprise_ai 実装として製造できる詳細設計へ落とし込む。

## 共通実装単位

`	ext
backend/src/studyai/systems/enterprise_ai/
frontend/src/pages/EnterpriseAiSystemPage.tsx
scripts/enterprise_ai_demo.py
backend/tests/systems/test_enterprise_ai_systems.py
`

## 共通API

| API | 用途 |
|---|---|
| GET /api/systemXX/metadata | system定義、default input、KPI、状態遷移を返す |
| POST /api/systemXX/execute | 教材入力を実行し、状態、結果、監査ログ、KPIを返す |
| GET /api/systemXX/runs | in-memory run store の直近実行を返す |

## 一覧

| No | 詳細設計 | テーマ | 実装方式 |
|---|---|---|---|
| system37 | system37_detailed_design.md | 取引実行型AIコンシェルジュ | enterprise_ai catalog差分 |
| system38 | system38_detailed_design.md | リアルタイム推薦・パーソナライズ | enterprise_ai catalog差分 |
| system39 | system39_detailed_design.md | 業務実行型カスタマーサポートAI | enterprise_ai catalog差分 |
| system40 | system40_detailed_design.md | 需要予測・在庫最適化AI | enterprise_ai catalog差分 |
| system41 | system41_detailed_design.md | コンピュータビジョン / マルチモーダルAI | enterprise_ai catalog差分 |
| system42 | system42_detailed_design.md | 不正検知・異常検知AI | enterprise_ai catalog差分 |
| system43 | system43_detailed_design.md | 制約最適化AI | enterprise_ai catalog差分 |
| system44 | system44_detailed_design.md | AI KPI / 実験評価ダッシュボード | enterprise_ai catalog差分 |

## 製造時の横断確認

- 8 system すべてが router に登録されていること。
- LM Studio は Docker 化せず、host.docker.internal 接続方式を維持すること。
- 商用APIで代替する場合は、`AI_PROVIDER=commercial` または `AI_PROVIDER=custom` を使う。初期MVPは mock が必須で、商用API未設定でもAPI、画面、テストが成立すること。
- Docker に入れられる backend / frontend / test は StudyAI の既存 compose に統合すること。
- 生成ファイルは UTF-8 BOMなしであること。
- 既存 system01 から system36 の成果物を上書きしないこと。
