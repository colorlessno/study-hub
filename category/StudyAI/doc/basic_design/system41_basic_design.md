# System 41 基本設計

## コンピュータビジョン / マルチモーダルAI

## 1. 設計目的

コンピュータビジョン / マルチモーダルAIは、企業AIシステムの「画像・現場AI」パターンを学習できる教材として設計する。実企業システムそのものを再現するのではなく、業務入力、AI判断、承認、実行、監査、評価の流れを小さく実装できる形へ整理する。

## 2. 配置方針

```text
category/StudyAI/
  src/backend/src/studyai/systems/enterprise_ai/
    catalog.py
    service.py
    router.py
  src/frontend/src/pages/EnterpriseAiSystemPage.tsx
  src/scripts/enterprise_ai_demo.py
  src/scripts/system41_enterprise_demo.py
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
  ↓ /api/system41/metadata・execute・runs
  ↓ EnterpriseAiRouter
  ↓ EnterpriseAiService
  ↓ Catalog / deterministic mock / JSON実行履歴
```

## 4. 業務フロー

```text
画像・OCR取込 -> 物品候補抽出 -> マスタ照合 -> センサー突合 -> 信頼度判断 -> 人間確認
```

## 5. コンポーネント設計

| コンポーネント | 役割 |
|---|---|
| `EnterpriseAiCatalog` | system別のテーマ、入力テンプレート、状態遷移、KPIを管理する |
| `EnterpriseAiService` | 入力を受け取り、商品照合、数量推定、確認待ち判定、人間確認記録、KPI・監査ログの生成、JSON履歴の保存と復元を行う |
| deterministic mock | 外部AIなしで同じ入力から同じ照合結果を生成する `EnterpriseAiService` 内の教材用処理 |
| `EnterpriseAiRouter` | `/api/system41` 配下の API を提供する |
| `EnterpriseAiSystemPage` | 入力例、照合結果、確認待ち、異常候補、人間確認結果、監査ログ、KPI、JSON保存状態を表示する |

## 6. 入出力設計

| 区分 | 内容 |
|---|---|
| 入力 | 棚画像、レシート画像、商品リスト、センサーイベント、OCR結果 |
| 出力 | 検出物品、数量推定、異常候補、信頼度、確認待ち一覧 |
| 状態 | uploaded / detected / matched / review_required / confirmed / rejected |

## 7. API設計

| メソッド | パス | 目的 |
|---|---|---|
| GET | `/api/system41/metadata` | タイトル、既定入力、状態遷移、KPI、注意点を取得する |
| POST | `/api/system41/execute` | 画像メタデータ、OCR、商品マスタ、センサー、人間確認結果を照合し、実行履歴へ保存する |
| GET | `/api/system41/runs` | JSONから復元したものを含む直近20件の実行履歴を取得する |

- API prefix は `/api/system41` とする。
- 実行response には `run_id`, `state`, `result`, `audit_log`, `kpi_snapshot`, `storage` を含める。
- `mode`などの業務入力検証エラーは400で`error_code`と`message`を返し、request schema違反はFastAPIの422を返す。

## 8. 画面設計

| 領域 | 内容 |
|---|---|
| 入力領域 | 棚画像、レシート画像、商品リスト、センサーイベント、OCR結果、人間確認結果をJSONで入力する。既定、低画質、数量不一致、高いしきい値、人間確認済みの入力例を選べる |
| 状態領域 | `uploaded / detected / matched / review_required / confirmed / rejected` の現在状態を表示する |
| 結果領域 | 商品照合、画像・OCR・センサーの数量、推定数量、異常候補、信頼度、確認待ち一覧、人間確認結果を表で表示する |
| 監査領域 | 判断理由、承認、却下、エスカレーションを時系列で表示する |
| 評価領域 | 成功率、リスク、コスト、レイテンシなどの教材用KPIを表示する |
| 保存領域 | JSONへの保存成否、保存形式、保持上限、現在の保持件数を表示する |

## 9. データ設計

| データ | 主な項目 |
|---|---|
| `data/enterprise_ai/system41_runs.json` | `run_id`, `system_id`, `title`, `pattern`, `state`, `input`, `result`, `audit_log`, `kpi_snapshot`, `created_at`, `storage` を持つ実行履歴の配列 |

- 実行履歴はUTF-8のJSONファイルへ保存し、直近20件を保持する。
- 保存時は一時ファイルを書き終えてから置換し、途中までのJSONを残さない。
- バックエンド起動時にJSONを読み込み、`GET /api/system41/runs` と画面の実行履歴へ復元する。
- JSONを読み込めない場合や保存できない場合は成功扱いにせず、エラーとして扱う。

## 10. 非機能・運用設計

- Docker に入れられる実装は StudyAI 既存の `backend` / `frontend` 共通サービスへ統合する。
- Docker build / run を実施しない場合は、製造工程の検証記録へ未実行理由を残す。
- 外部AI APIが使えない場合はモックで同じ response schema を返す。
- 個人情報、秘密情報、決済情報そのものは教材データに含めない。
- 作成・更新するテストファイルは UTF-8 BOMなしで保存する。
- JSON実行履歴もUTF-8で保存する。Dockerでは`./src/backend/data:/app/backend/data`のbind mountを使い、コンテナ再作成後もホスト側のデータ領域から復元できる構成にする。

## 11. 後続工程への引き継ぎ

詳細設計では、request / response schema、状態遷移表、監査ログ項目、KPI項目、エラーコード、検証コマンドを具体化する。
