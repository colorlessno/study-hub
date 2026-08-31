# System 43 基本設計

## 制約最適化AI

## 1. 設計目的

制約最適化AIは、企業AIシステムの「最適化・スケジューリング」パターンを学習できる教材として設計する。実企業システムそのものを再現するのではなく、業務入力、AI判断、承認、実行、監査、評価の流れを小さく実装できる形へ整理する。

## 2. 配置方針

```text
category/StudyAI/
  src/backend/src/studyai/systems/enterprise_ai/
    catalog.py
    service.py
    router.py
  src/frontend/src/pages/EnterpriseAiSystemPage.tsx
  src/scripts/enterprise_ai_demo.py
  src/scripts/system43_enterprise_demo.py
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
  ↓ /api/system43/metadata・execute・runs
  ↓ EnterpriseAiRouter
  ↓ EnterpriseAiService
  ↓ Catalog / MockDecisionEngine / EnterpriseAiServiceのJSON保存処理
  ↓ data/enterprise_ai/system43_runs.json
```

## 4. 業務フロー

```text
対象データ取込 -> 制約定義 -> 目的関数設定 -> 候補解生成 -> 制約違反確認 -> 人間調整
```

## 5. コンポーネント設計

| コンポーネント | 役割 |
|---|---|
| `EnterpriseAiCatalog` | system別のテーマ、入力テンプレート、状態遷移、KPIを管理する |
| `EnterpriseAiService` | 入力を受け取り、業務判断、提案、状態遷移、評価結果を生成する |
| `MockDecisionEngine` | 外部AIなしで候補比較・スコアリング・分類・最適化の疑似結果を返す |
| `EnterpriseAiService` のJSON保存処理 | 実行結果と監査記録をUTF-8のJSONファイルへ保存し、再起動時に復元する |
| `EnterpriseAiRouter` | `/api/system43` 配下の API を提供する |
| `EnterpriseAiSystemPage` | 入力例、状態、割当、ルート、制約違反、コスト、調整候補、監査記録、保存状態、実行履歴を表示する |

## 6. 入出力設計

| 区分 | 内容 |
|---|---|
| 入力 | タスク、担当者・時間枠、場所、優先度、制約条件、コスト関数 |
| 出力 | 割当案、ルート案、制約違反、総コスト、調整候補 |
| 状態 | drafted / optimized / violation_found / adjusted / accepted |

## 7. API設計

| メソッド | パス | 目的 |
|---|---|---|
| GET | `/api/system43/metadata` | テーマ情報、既定入力、状態遷移、評価指標を取得する |
| POST | `/api/system43/execute` | 制約最適化と人間調整の記録を実行する |
| GET | `/api/system43/runs` | JSONへ保存した直近20件の実行履歴を取得する |

- API prefix は `/api/system43` とする。
- response には `run_id`, `state`, `result`, `audit_log`, `kpi_snapshot`, `storage` を含める。
- request schema違反はFastAPIの422を返す。
- `mode`などの業務入力検証エラーは400で、`detail`の中に`error_code`と`message`を返す。

## 8. 画面設計

| 領域 | 内容 |
|---|---|
| 入力領域 | タスク、担当者・時間枠、場所、優先度、制約条件、コスト関数 をJSONまたはフォームで入力する |
| 状態領域 | `drafted / optimized / violation_found / adjusted / accepted` の現在状態を表示する |
| 結果領域 | 割当案、ルート案、制約違反、総コスト、調整候補 を表、カード、JSONで表示する |
| 監査領域 | 判断理由、承認、却下、エスカレーションを時系列で表示する |
| 評価領域 | 成功率、リスク、コスト、レイテンシなどの教材用KPIを表示する |
| 入力例領域 | 既定の割当、未割当、時間超過、必須仕事不足、人間調整の入力例へ切り替える |
| 保存領域 | JSON保存の成否、保存形式、保存上限、現在の保存件数を表示する |

## 9. データ設計

| データ | 主な項目 |
|---|---|
| `system43_runs.json` | `run_id`, `system_id`, `state`, `result`, `audit_log`, `kpi_snapshot`, `created_at` |
| `result.human_adjustment_record` | `adjustment_id`, `status`, `operator`, `assignments`, `recorded` |
| `storage` | `saved`, `format`, `retention_limit`, `retained_runs` |

実行履歴は `data/enterprise_ai/system43_runs.json` へUTF-8で保存する。保存件数は新しい順の直近20件とし、バックエンド起動時にファイルから復元する。保存に失敗した実行は保存成功として扱わない。

## 10. 非機能・運用設計

- Docker に入れられる実装は StudyAI 既存の `backend` / `frontend` 共通サービスへ統合する。
- Docker build / run を実施しない場合は、製造工程の検証記録へ未実行理由を残す。
- 外部AI APIが使えない場合はモックで同じ response schema を返す。
- 個人情報、秘密情報、決済情報そのものは教材データに含めない。
- 作成・更新するテストファイルは UTF-8 BOMなしで保存する。

## 11. 後続工程への引き継ぎ

詳細設計では、request / response schema、状態遷移表、監査ログ項目、KPI項目、エラーコード、検証コマンドを具体化する。
