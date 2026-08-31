# System 42 基本設計

## 不正検知・異常検知AI

## 1. 設計目的

不正検知・異常検知AIは、企業AIシステムの「リスク検知」パターンを学習できる教材として設計する。実企業システムそのものを再現するのではなく、業務入力、AI判断、承認、実行、監査、評価の流れを小さく実装できる形へ整理する。

## 2. 配置方針

```text
category/StudyAI/
  src/backend/src/studyai/systems/enterprise_ai/
    catalog.py
    service.py
    router.py
  src/frontend/src/pages/EnterpriseAiSystemPage.tsx
  src/scripts/enterprise_ai_demo.py
  src/scripts/system42_enterprise_demo.py
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
  ↓ /api/system42/metadata・execute・runs
  ↓ EnterpriseAiRouter
  ↓ EnterpriseAiService
  ↓ Catalog / deterministic mock・LM Studio / JSON実行履歴
```

## 4. 業務フロー

```text
ログ取込 -> 特徴量作成 -> リスクスコア算出 -> 判断 -> アラート -> 監査記録 -> 確認結果反映
```

## 5. コンポーネント設計

| コンポーネント | 役割 |
|---|---|
| `EnterpriseAiCatalog` | system別のテーマ、入力テンプレート、状態遷移、KPIを管理する |
| `EnterpriseAiService` | 入力を受け取り、リスク点、判定、アラート、確認結果、評価、監査ログ、KPIを生成して実行履歴を保存する |
| deterministic mock | 外部AIなしで取引・ログイン・端末・過去履歴を加点し、許可・保留・拒否を再現可能な規則で判定する |
| JSON実行履歴 | system42の実行結果をUTF-8のJSONへ直近20件保存し、起動時に復元する |
| `EnterpriseAiRouter` | `/api/system42` 配下の API を提供する |
| `EnterpriseAiSystemPage` | 入力例、入力JSON、状態、判定根拠、アラート、確認結果、保存状態、監査ログ、KPI、実行履歴を表示する |

## 6. 入出力設計

| 区分 | 内容 |
|---|---|
| 入力 | 取引ログ、ログイン履歴、端末情報、金額、地域、過去パターン |
| 出力 | リスクスコア、判定理由、アラート、承認・保留・拒否、監査ログ |
| 状態 | scored / allowed / held / rejected / reviewed / false_positive / false_negative |

## 7. API設計

| メソッド | パス | 目的 |
|---|---|---|
| GET | `/api/system42/metadata` | テーマ情報、既定入力、状態遷移、KPI、注意点を返す |
| POST | `/api/system42/execute` | 入力を受け取り、リスク判定、確認後評価、監査記録、KPIを生成して保存する |
| GET | `/api/system42/runs` | JSONから復元したものを含む直近20件の実行履歴を返す |

- API prefix は `/api/system42` とする。
- response には `run_id`, `state`, `result`, `audit_log`, `kpi_snapshot`, `storage` を含める。
- request schema違反はFastAPIの422を返す。
- `mode`などの業務入力検証エラーは400で、`detail`の中に`error_code`と`message`を返す。

## 8. 画面設計

| 領域 | 内容 |
|---|---|
| 入力領域 | 拒否・通常取引・保留・誤検知・見逃しの入力例を選び、取引ログ、ログイン履歴、端末情報、過去パターン、しきい値、確認結果をJSONで編集する |
| 状態領域 | `scored / allowed / held / rejected / reviewed / false_positive / false_negative` の現在状態を表示する |
| 結果領域 | 根拠別の加点、リスク点、判定理由、アラート、確認結果、誤検知・見逃し、推定コストを表で表示する |
| 保存状態領域 | JSON保存の成否、保存形式、保存上限、保存件数を表示する |
| 監査領域 | 判断理由、承認、却下、エスカレーションを時系列で表示する |
| 評価領域 | 成功率、リスク、コスト、レイテンシなどの教材用KPIを表示する |
| 実行履歴領域 | JSONへ保存された直近20件を表示し、選択した履歴の結果を再表示する |

## 9. データ設計

| データ | 主な項目 |
|---|---|
| `data/enterprise_ai/system42_runs.json` | 実行履歴を新しい順に最大20件保持するUTF-8 JSON配列 |
| 実行履歴 | `run_id`, `system_id`, `title`, `pattern`, `state`, `input`, `result`, `audit_log`, `kpi_snapshot`, `created_at`, `storage` |
| `result` | 加点内訳、判定、アラート、確認結果、誤検知・見逃し評価、推定コスト |
| `storage` | `saved`, `format`, `retention_limit`, `retained_runs` |

実行履歴は一時ファイルへUTF-8で書き込んだ後に置き換え、新しい順に20件まで保存する。StudyAIバックエンドの起動時にJSONを読み込み、再起動後も `/api/system42/runs` と画面から履歴を確認できるようにする。保存先を設定している環境で書き込みや読込に失敗した場合は、成功したものとして扱わない。

## 10. 非機能・運用設計

- Docker に入れられる実装は StudyAI 既存の `backend` / `frontend` 共通サービスへ統合する。
- Docker build / run を実施しない場合は、製造工程の検証記録へ未実行理由を残す。
- 外部AI APIが使えない場合はモックで同じ response schema を返す。
- 個人情報、秘密情報、決済情報そのものは教材データに含めない。
- 作成・更新するテストファイルは UTF-8 BOMなしで保存する。
- JSON実行履歴はUTF-8で読み書きし、直近20件の上限と再起動後の復元をテストする。

## 11. 後続工程への引き継ぎ

詳細設計では、request / response schema、状態遷移表、監査ログ項目、KPI項目、エラーコード、検証コマンドを具体化する。
