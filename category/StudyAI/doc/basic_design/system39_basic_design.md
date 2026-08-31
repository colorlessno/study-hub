# System 39 基本設計

## 業務実行型カスタマーサポートAI

## 1. 設計目的

業務実行型カスタマーサポートAIは、企業AIシステムの「問い合わせ・手続き」パターンを学習できる教材として設計する。実企業システムそのものを再現するのではなく、業務入力、AI判断、承認、実行、監査、評価の流れを小さく実装できる形へ整理する。

## 2. 配置方針

```text
category/StudyAI/
  src/backend/src/studyai/systems/enterprise_ai/
    catalog.py
    service.py
    router.py
  src/frontend/src/pages/EnterpriseAiSystemPage.tsx
  src/scripts/enterprise_ai_demo.py
  src/scripts/system39_enterprise_demo.py
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
  ↓ /api/system39
  ↓ EnterpriseAiRouter
  ↓ EnterpriseAiService
  ↓ Catalog / MockDecisionEngine / JSON実行履歴
```

## 4. 業務フロー

```text
問い合わせ受付 -> 分類 -> 本人確認判断 -> 回答または手続き -> 記録 -> エスカレーション
```

## 5. コンポーネント設計

| コンポーネント | 役割 |
|---|---|
| `EnterpriseAiCatalog` | system別のテーマ、入力テンプレート、状態遷移、KPIを管理する |
| `EnterpriseAiService` | 入力を受け取り、業務判断、提案、状態遷移、評価結果を生成する |
| `MockDecisionEngine` | 外部AIなしで候補比較・スコアリング・分類・最適化の疑似結果を返す |
| `EnterpriseAiRouter` | `/api/system39` 配下の API を提供する |
| `EnterpriseAiSystemPage` | 入力、状態、提案、監査ログ、KPIを表示する |
| `system39_runs.json` | 手続き受付、チケット、引継ぎ、監査記録、KPIを含む直近20件の実行履歴を保存する |

## 6. 入出力設計

| 区分 | 内容 |
|---|---|
| 入力 | 問い合わせ文、顧客状態、注文情報、FAQ、本人確認結果 |
| 出力 | 分類、回答案、実行可能手続き、処理結果、チケット、引継ぎ要約 |
| 状態 | received / classified / verification_required / answered / processed / escalated / closed |

## 7. API設計

| メソッド | パス | 目的 |
|---|---|---|
| GET | `/api/system39/metadata` | 画面表示用のテーマ情報と既定入力を取得する |
| POST | `/api/system39/execute` | 問い合わせを分類し、回答・手続き・チケット・引継ぎを処理する |
| GET | `/api/system39/runs` | JSONから復元した実行履歴を含む直近20件を取得する |

- API prefix は `/api/system39` とする。
- response には `run_id`, `state`, `result`, `audit_log`, `kpi_snapshot` を含める。
- エラー時は `error_code`, `message`, `detail`, `trace_id` を返す。

## 8. 画面設計

| 領域 | 内容 |
|---|---|
| 入力領域 | 問い合わせ文、顧客状態、注文情報、FAQ、本人確認結果 をJSONまたはフォームで入力する |
| 状態領域 | `received / classified / verification_required / answered / processed / escalated / closed` の現在状態を表示する |
| 結果領域 | 分類、回答案、実行可能手続き、処理結果、チケット、引継ぎ要約 を表、カード、JSONで表示する |
| 監査領域 | 判断理由、承認、却下、エスカレーションを時系列で表示する |
| 評価領域 | 成功率、リスク、コスト、レイテンシなどの教材用KPIを表示する |

## 9. データ設計

| データ | 主な項目 |
|---|---|
| `system39_runs.json` | `run_id`, `input`, `state`, `result`, `audit_log`, `kpi_snapshot`, `created_at`, `storage` |

保存先は `SYSTEM39_RUN_FILE` で変更できる。書き込み時は一時ファイルを置換し、直近20件をUTF-8のJSON配列として保持する。起動時に既存ファイルを読み込み、画面の実行履歴へ復元する。

## 10. 非機能・運用設計

- Docker に入れられる実装は StudyAI 既存の `backend` / `frontend` 共通サービスへ統合する。
- Docker build / run を実施しない場合は、製造工程の検証記録へ未実行理由を残す。
- 外部AI APIが使えない場合はモックで同じ response schema を返す。
- 個人情報、秘密情報、決済情報そのものは教材データに含めない。
- 作成・更新するテストファイルは UTF-8 BOMなしで保存する。

## 11. 後続工程への引き継ぎ

詳細設計では、request / response schema、状態遷移表、監査ログ項目、KPI項目、エラーコード、検証コマンドを具体化する。
