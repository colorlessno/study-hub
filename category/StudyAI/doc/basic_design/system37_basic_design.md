# System 37 基本設計

## 取引実行型AIコンシェルジュ

## 1. 設計目的

取引実行型AIコンシェルジュは、企業AIシステムの「予約・申込・注文」パターンを学習できる教材として設計する。実企業システムそのものを再現するのではなく、業務入力、AI判断、承認、実行、監査、評価の流れを小さく実装できる形へ整理する。

## 2. 配置方針

```text
category/StudyAI/
  src/backend/src/studyai/systems/enterprise_ai/
    catalog.py
    service.py
    router.py
  src/frontend/src/pages/EnterpriseAiSystemPage.tsx
  src/scripts/enterprise_ai_demo.py
  src/scripts/system37_enterprise_demo.py
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
  ↓ /api/system37
  ↓ EnterpriseAiRouter
  ↓ EnterpriseAiService
  ↓ Catalog / MockDecisionEngine / JsonRunStore
  ↓ data/enterprise_ai/system37_runs.json
```

## 4. 業務フロー

```text
条件聞き出し -> 候補検索 -> 候補比較 -> 確定前確認 -> 実行記録 -> 変更取消判断
```

## 5. コンポーネント設計

| コンポーネント | 役割 |
|---|---|
| `EnterpriseAiCatalog` | system別のテーマ、入力テンプレート、状態遷移、KPIを管理する |
| `EnterpriseAiService` | 入力を受け取り、業務判断、提案、状態遷移、評価結果を生成する |
| `MockDecisionEngine` | 外部AIなしで候補比較・スコアリング・分類・最適化の疑似結果を返す |
| `JsonRunStore` | system37の直近20件の入力、判断、取引結果、監査記録、KPIを再起動後も残す |
| `EnterpriseAiRouter` | `/api/system37` 配下の API を提供する |
| `EnterpriseAiSystemPage` | 入力、状態、提案、監査ログ、KPIを表示する |

## 6. 入出力設計

| 区分 | 内容 |
|---|---|
| 入力 | 希望条件、候補リスト、価格、本人確認状況、最終確認、実行・変更・取消の操作指定 |
| 出力 | 追加質問、候補一覧、確定確認、実行・変更・取消結果、失敗理由、保存状態 |
| 状態 | hearing / confirming / executed / changed / cancelled / escalated |

## 7. API設計

| メソッド | パス | 目的 |
|---|---|---|
| GET | `/api/system37/metadata` | テーマ情報と既定入力を取得する |
| POST | `/api/system37/execute` | 条件を判定し、実行・変更・取消結果を保存する |
| GET | `/api/system37/runs` | JSONへ永続化した直近20件の実行履歴を取得する |

- API prefix は `/api/system37` とする。
- response には `run_id`, `state`, `result`, `audit_log`, `kpi_snapshot` を含める。
- エラー時は `error_code`, `message`, `detail`, `trace_id` を返す。

## 8. 画面設計

| 領域 | 内容 |
|---|---|
| 入力領域 | 既定値、条件不足、確認待ち、実行、変更、取消の例を選び、JSONを編集する |
| 状態領域 | `hearing / confirming / executed / changed / cancelled / escalated` の現在状態を表示する |
| 結果領域 | 追加質問、候補順位、確定確認、実行・変更・取消結果、失敗理由を表とJSONで表示する |
| 監査領域 | 判断理由、承認、却下、エスカレーションを時系列で表示する |
| 評価領域 | 成功率、リスク、コスト、レイテンシなどの教材用KPIを表示する |
| 保存領域 | JSON保存の成否、保存形式、保存上限、現在件数を表示する |

## 9. データ設計

| データ | 主な項目 |
|---|---|
| `system37_runs.json` | `run_id`, `input`, `state`, `result`, `audit_log`, `kpi_snapshot`, `created_at`, `storage` |

`data/enterprise_ai/system37_runs.json` に直近20件をUTF-8で保存する。起動時に同ファイルを読み込み、履歴APIへ返す。保存時は一時ファイルを作成してから置換する。実予約、実決済、実顧客情報ではなく、教材上の取引判断と実行記録だけを保存する。

## 10. 非機能・運用設計

- Docker に入れられる実装は StudyAI 既存の `backend` / `frontend` 共通サービスへ統合する。
- Docker build / run を実施しない場合は、製造工程の検証記録へ未実行理由を残す。
- 外部AI APIが使えない場合はモックで同じ response schema を返す。
- 個人情報、秘密情報、決済情報そのものは教材データに含めない。
- 作成・更新するテストファイルは UTF-8 BOMなしで保存する。

## 11. 後続工程への引き継ぎ

詳細設計では、request / response schema、状態遷移表、監査ログ項目、KPI項目、エラーコード、検証コマンドを具体化する。
