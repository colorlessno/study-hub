# System 40 基本設計

## 需要予測・在庫最適化AI

## 1. 設計目的

需要予測・在庫最適化AIは、企業AIシステムの「需要予測・補充」パターンを学習できる教材として設計する。実企業システムそのものを再現するのではなく、業務入力、AI判断、承認、実行、監査、評価の流れを小さく実装できる形へ整理する。

## 2. 配置方針

```text
category/StudyAI/
  src/backend/src/studyai/systems/enterprise_ai/
    catalog.py
    service.py
    router.py
  src/frontend/src/pages/EnterpriseAiSystemPage.tsx
  src/scripts/enterprise_ai_demo.py
  src/scripts/system40_enterprise_demo.py
  backend/tests/systems/test_enterprise_ai_systems.py
```

- 既存の `system01` から `system36` は変更しない。
- `system37` から `system44` は共通の企業AI教材実装を共有し、catalog で system別の差分を管理する。
- LM Studio 本体は Docker 化せず、既存方式と同じくローカル起動し、Docker からは `host.docker.internal` 経由で接続する。
- 初期MVPは外部AIなしのモック・サンプルデータで成立させる。

## 3. 全体構成

```text
利用者
  ↓ EnterpriseAiSystemPage
  ↓ /api/system40
  ↓ EnterpriseAiRouter
  ↓ EnterpriseAiService
  ↓ Catalog / MockDecisionEngine / JSON実行履歴
```

## 4. 業務フロー

```text
販売履歴取込 -> 需要予測 -> 在庫日数計算 -> 欠品リスク判断 -> 補充提案 -> 承認記録
```

## 5. コンポーネント設計

| コンポーネント | 役割 |
|---|---|
| `EnterpriseAiCatalog` | system別のテーマ、入力テンプレート、状態遷移、KPIを管理する |
| `EnterpriseAiService` | 入力を受け取り、業務判断、提案、状態遷移、評価結果を生成する |
| `MockDecisionEngine` | 外部AIなしで候補比較・スコアリング・分類・最適化の疑似結果を返す |
| `EnterpriseAiRouter` | `/api/system40` 配下の API を提供する |
| `EnterpriseAiSystemPage` | 入力、状態、提案、監査ログ、KPIを表示する |
| `system40_runs.json` | 補充提案、承認結果、発注候補、監査記録、KPIを含む直近20件の実行履歴を保存する |

## 6. 入出力設計

| 区分 | 内容 |
|---|---|
| 入力 | 販売履歴、在庫数、入荷予定、季節性、イベント、リードタイム |
| 出力 | 需要予測、欠品リスク、推奨発注量、補充理由、承認待ち一覧 |
| 状態 | forecasted / risk_detected / proposed / approved / rejected |

## 7. API設計

| メソッド | パス | 目的 |
|---|---|---|
| GET | `/api/system40/metadata` | テーマ定義と既定入力を取得する |
| POST | `/api/system40/execute` | 予測、補充提案、承認結果を生成して保存する |
| GET | `/api/system40/runs` | 保存済みの実行履歴を取得する |

- API prefix は `/api/system40` とする。
- response には `run_id`, `state`, `result`, `audit_log`, `kpi_snapshot` を含める。
- エラー時は `error_code`, `message`, `detail`, `trace_id` を返す。

## 8. 画面設計

| 領域 | 内容 |
|---|---|
| 入力領域 | 販売履歴、在庫数、入荷予定、季節性、イベント、リードタイム をJSONまたはフォームで入力する |
| 状態領域 | `forecasted / risk_detected / proposed / approved / rejected` の現在状態を表示する |
| 結果領域 | 需要予測、欠品リスク、推奨発注量、補充理由、承認待ち一覧 を表、カード、JSONで表示する |
| 監査領域 | 判断理由、承認、却下、エスカレーションを時系列で表示する |
| 評価領域 | 成功率、リスク、コスト、レイテンシなどの教材用KPIを表示する |

## 9. データ設計

| データ | 主な項目 |
|---|---|
| `system40_runs.json` | `run_id`, `input`, `state`, `result`, `audit_log`, `kpi_snapshot`, `storage`, `created_at` |
| `result.replenishment_proposal` | 提案ID、需要予測、欠品リスク、補充量、理由、承認状態、承認者、発注候補記録 |
| `audit_log` | `run_id`, `action`, `actor`, `reason`, `timestamp` |

直近20件を `data/enterprise_ai/system40_runs.json` へUTF-8で保存する。一時ファイルを書き終えてから置換し、StudyAI起動時に読み戻す。

## 10. 非機能・運用設計

- Docker に入れられる実装は StudyAI 既存の `backend` / `frontend` 共通サービスへ統合する。
- Docker build / run を実施しない場合は、製造工程の検証記録へ未実行理由を残す。
- 外部AI APIが使えない場合はモックで同じ response schema を返す。
- 個人情報、秘密情報、決済情報そのものは教材データに含めない。
- 作成・更新するテストファイルは UTF-8 BOMなしで保存する。
- 保存ファイルを読み書きできない場合は、履歴を失ったまま成功扱いにせずエラーを返す。

## 11. 後続工程への引き継ぎ

詳細設計では、request / response schema、状態遷移表、監査ログ項目、KPI項目、エラーコード、検証コマンドを具体化する。
