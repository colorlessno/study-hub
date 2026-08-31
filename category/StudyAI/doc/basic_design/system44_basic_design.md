# System 44 基本設計

## AI KPI / 実験評価ダッシュボード

## 1. 設計目的

AI KPI / 実験評価ダッシュボードは、企業AIシステムの「AI評価・実験」パターンを学習できる教材として設計する。実企業システムそのものを再現するのではなく、業務入力、AI判断、承認、実行、監査、評価の流れを小さく実装できる形へ整理する。

## 2. 配置方針

```text
category/StudyAI/
  src/backend/src/studyai/systems/enterprise_ai/
    catalog.py
    service.py
    router.py
  src/frontend/src/pages/EnterpriseAiSystemPage.tsx
  src/scripts/enterprise_ai_demo.py
  src/scripts/system44_enterprise_demo.py
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
  ↓ /api/system44/metadata・execute・runs
  ↓ EnterpriseAiRouter
  ↓ EnterpriseAiService
  ↓ Catalog / MockDecisionEngine / EnterpriseAiServiceのJSON保存処理
  ↓ data/enterprise_ai/system44_runs.json
```

## 4. 業務フロー

```text
実験定義 -> 指標収集 -> A/B比較 -> 失敗分類 -> 改善候補作成 -> 意思決定記録
```

## 5. コンポーネント設計

| コンポーネント | 役割 |
|---|---|
| `EnterpriseAiCatalog` | system別のテーマ、入力テンプレート、状態遷移、KPIを管理する |
| `EnterpriseAiService` | 入力を受け取り、業務判断、提案、状態遷移、評価結果を生成する |
| `MockDecisionEngine` | 外部AIなしで候補比較・スコアリング・分類・最適化の疑似結果を返す |
| `EnterpriseAiService` のJSON保存処理 | 実験結果と意思決定記録をUTF-8のJSONファイルへ保存し、再起動時に復元する |
| `EnterpriseAiRouter` | `/api/system44` 配下の API を提供する |
| `EnterpriseAiSystemPage` | 入力例、A/B比較、AI品質、コスト、応答時間、失敗分類、改善候補、意思決定、保存状態、実行履歴を表示する |

## 6. 入出力設計

| 区分 | 内容 |
|---|---|
| 入力 | 実験variant、業務KPI、AI品質指標、コスト、レイテンシ、human review結果 |
| 出力 | KPI、A/B比較・失敗分類、改善候補、意思決定メモ |
| 状態 | planned / running / measured / analyzed / decided / archived |

## 7. API設計

| メソッド | パス | 目的 |
|---|---|---|
| GET | `/api/system44/metadata` | テーマ情報、既定入力、状態遷移、評価指標を取得する |
| POST | `/api/system44/execute` | 実験評価と人間の意思決定記録を実行する |
| GET | `/api/system44/runs` | JSONへ保存した直近20件の実行履歴を取得する |

- API prefix は `/api/system44` とする。
- response には `run_id`, `state`, `result`, `audit_log`, `kpi_snapshot`, `storage` を含める。
- request schema違反はFastAPIの422を返す。
- `mode`などの業務入力検証エラーは400で、`detail`の中に`error_code`と`message`を返す。

## 8. 画面設計

| 領域 | 内容 |
|---|---|
| 入力領域 | 実験variant、業務KPI、AI品質指標、コスト、レイテンシ、human review結果 をJSONまたはフォームで入力する |
| 状態領域 | `planned / running / measured / analyzed / decided / archived` の現在状態を表示する |
| 結果領域 | KPI、A/B比較・失敗分類、改善候補、意思決定メモ を表、カード、JSONで表示する |
| 監査領域 | 判断理由、承認、却下、エスカレーションを時系列で表示する |
| 評価領域 | 成功率、リスク、コスト、レイテンシなどの教材用KPIを表示する |
| 入力例領域 | 既定の実験、品質低下、コスト超過、応答遅延、意思決定済みの入力例へ切り替える |
| 保存領域 | JSON保存の成否、保存形式、保存上限、現在の保存件数を表示する |

## 9. データ設計

| データ | 主な項目 |
|---|---|
| `system44_runs.json` | `run_id`, `system_id`, `state`, `result`, `audit_log`, `kpi_snapshot`, `created_at` |
| `result.decision_memo` | `memo_id`, `status`, `reviewer`, `automatic_decision`, `decision`, `reason`, `improvement_action`, `next_experiment`, `recorded` |
| `storage` | `saved`, `format`, `retention_limit`, `retained_runs` |

実行履歴は `data/enterprise_ai/system44_runs.json` へUTF-8で保存する。保存件数は新しい順の直近20件とし、バックエンド起動時にファイルから復元する。保存に失敗した実行は保存成功として扱わない。

## 10. 非機能・運用設計

- Docker に入れられる実装は StudyAI 既存の `backend` / `frontend` 共通サービスへ統合する。
- Docker build / run を実施しない場合は、製造工程の検証記録へ未実行理由を残す。
- 外部AI APIが使えない場合はモックで同じ response schema を返す。
- 個人情報、秘密情報、決済情報そのものは教材データに含めない。
- 作成・更新するテストファイルは UTF-8 BOMなしで保存する。

## 11. 後続工程への引き継ぎ

詳細設計では、request / response schema、状態遷移表、監査ログ項目、KPI項目、エラーコード、検証コマンドを具体化する。
