# System 41 詳細設計

## コンピュータビジョン / マルチモーダルAI

---

## 1. 実装配置

```text
backend/src/studyai/systems/enterprise_ai/
  __init__.py
  catalog.py
  service.py
  router.py
backend/src/studyai/common/config/settings.py
frontend/src/pages/EnterpriseAiSystemPage.tsx
scripts/enterprise_ai_demo.py
scripts/system41_enterprise_demo.py
backend/tests/systems/test_enterprise_ai_systems.py
data/enterprise_ai/system41_runs.json
```

- system41 専用の物理ディレクトリは作らず、enterprise_ai 共通実装の catalog 差分として実装する。
- 既存の system01 から system40 の成果物は変更しない。
- LM Studio 本体は Docker 化せずローカル起動とし、Docker コンテナの backend から host.docker.internal の OpenAI互換APIへ接続できる構成を維持する。
- 初期MVPは外部AIが未起動でも動作するよう、決定ロジックは deterministic mock とサンプルデータで成立させる。
- 作成・更新するテキストファイルは UTF-8 BOMなしで保存する。

## 2. catalog 定義

catalog.py に system41 の設定を追加する。

| 項目 | 値 |
|---|---|
| system_id | system41 |
| title | コンピュータビジョン / マルチモーダルAI |
| pattern | 画像・現場AI |
| default_input | 棚画像、レシート画像、商品リスト、センサーイベント、OCR結果 を含む教材用JSON |
| state_flow | uploaded / detected / matched / review_required / confirmed / rejected |
| kpi_definitions | 検出精度、マスタ一致率、人間確認率、誤検知率 |
| risk_points | 低解像度画像での誤検知、マスタ未登録商品、センサー誤動作 |

default_input は秘密情報、個人情報、実決済情報を含めない。実企業システムそのものを再現するのではなく、業務判断、AI判断、承認、監査、評価の学習に必要な最小データへ限定する。

## 3. API 詳細

### 3.1 GET /api/system41/metadata

response:

```json
{
  "system_id": "system41",
  "title": "コンピュータビジョン / マルチモーダルAI",
  "pattern": "画像・現場AI",
  "default_input": {},
  "state_flow": [],
  "kpi_definitions": [],
  "risk_points": []
}
```

### 3.2 POST /api/system41/execute

request:

```json
{
  "input": {},
  "mode": "mock",
  "operator": "learner"
}
```

response:

```json
{
  "run_id": "uuid",
  "system_id": "system41",
  "state": "string",
  "result": {},
  "audit_log": [],
  "kpi_snapshot": {},
  "storage": {
    "saved": true,
    "format": "json",
    "retention_limit": 20,
    "retained_runs": 1
  },
  "created_at": "ISO-8601"
}
```

### 3.3 GET /api/system41/runs

response:

```json
{
  "runs": []
}
```

- /api/system41 は router.py の factory で生成し、StudyAI の main router へ登録する。
- ルート追加時は system37 から system44 をまとめて登録し、漏れがないことをテストで確認する。

## 4. request schema

| フィールド | 型 | 必須 | 内容 |
|---|---|---|---|
| input | object | yes | system別の教材入力。主項目は 棚画像、レシート画像、商品リスト、センサーイベント、OCR結果 |
| mode | string | no | mock または lmstudio。初期値は mock |
| operator | string | no | 操作者。監査ログの actor に入れる |

validation:

- input がobject でない場合は 400 を返す。
- mode=lmstudio の通信・応答検証に失敗した場合は502を返し、mockへ切り替えない。mockは利用者が明示的に選択した場合だけ実行する。
- 教材用途のため、API key、password、token、実カード番号に相当するキーが入力された場合は保存せず、mask する。

## 5. response / result schema

| フィールド | 型 | 内容 |
|---|---|---|
| run_id | string | 実行単位ID |
| system_id | string | system41 |
| state | string | uploaded / detected / matched / review_required / confirmed / rejected のいずれか |
| result.summary | string | 画像、OCR、商品マスタ、センサーを照合した判断概要 |
| result.recommendations | array | 商品ID、各入力の数量、推定数量、信頼度、確認理由、処理区分を持つ検出候補 |
| result.confirmation_queue | array | 人間確認が必要な候補と理由 |
| result.anomaly_candidates | array | マスタ未登録、センサー不一致、数量不一致などの異常候補 |
| result.human_review_record | object | `review_id`, `status`, `reviewer`, `decisions`, `recorded` を持つ人間確認記録 |
| result.risk_flags | array | 画像品質不足、マスタ未登録商品、センサー不一致、レビュー未実施などの注意点 |
| audit_log | array | 入力受付、判断元、完了の証跡 |
| kpi_snapshot | object | 検出精度、マスタ一致率、人間確認率、誤検知率 を含むKPI |
| storage | object | JSON保存成否、保存形式、保持上限20件、現在の保持件数 |

## 6. 状態遷移

| from | event | to | 監査ログ |
|---|---|---|---|
| start | request accepted | 処理中 | request_received |
| 処理中 | 確認理由がある候補を検出 | review_required | multimodal_detection_recorded / human_review_requested |
| 処理中 | 確認理由がない | confirmed | multimodal_detection_recorded / execution_completed |
| 処理中 | 人間確認で採用 | confirmed | human_review_recorded |
| 処理中 | 人間確認で却下 | rejected | human_review_recorded |
| 処理中 | LM Studio利用不可 | error (HTTP 502) | runを保存しない |

metadataの状態候補は uploaded / detected / matched / review_required / confirmed / rejected とし、画面では学習上の処理順として表示する。現在の`execute`は中間状態を個別保存せず、`review_required`, `confirmed`, `rejected`のいずれかを実行履歴へ保存する。

## 7. サービス処理

EnterpriseAiService.execute(system_id, payload) の処理内容:

1. catalog.py から system41 の定義を取得する。
2. request をvalidate し、秘密情報に見える値をmask する。
3. mode=lmstudio かつ接続情報がある場合は OpenAI互換API呼び出し候補を作る。
4. LM Studio が利用できない場合は処理を失敗させ、mock判断と実行履歴の保存を行わない。
5. 商品候補を商品マスタへ照合し、OCR・センサーの数量、画像品質、信頼度しきい値から推定数量と確認理由を生成する。
6. 人間確認結果を `human_review_record` と監査ログへ記録する。
7. result, audit_log, kpi_snapshot, storage をresponse schemaへ整形する。
8. 直近20件へ整理し、UTF-8の `data/enterprise_ai/system41_runs.json` へ保存する。

### 7.1 JSON実行履歴

- `Settings.system41_run_file` の既定値を `./data/enterprise_ai/system41_runs.json` とする。
- バックエンド起動時にJSON配列を読み込み、直近20件をメモリ上の実行履歴へ復元する。
- 実行完了ごとに新しい履歴を先頭へ追加し、21件目以降を削除する。
- `ensure_ascii=False`, `encoding="utf-8"`, インデント2で保存する。
- 同じフォルダの一時ファイルへ書き込んだ後、保存先へ置換する。
- JSONが配列でない場合、配列要素がobjectでない場合、読込・保存に失敗した場合はエラーとし、保存成功を返さない。

## 8. 監査ログ

| 項目 | 型 | 内容 |
|---|---|---|
| timestamp | string | ISO-8601 |
| run_id | string | 実行単位ID |
| system_id | string | system41 |
| actor | string | operator または system |
| action | string | request_received, decision_generated, risk_flagged, execution_completed など |
| reason | string | 判断理由 |
| input_hash | string | 入力JSONの簡易ハッシュ |

監査ログには raw input 全文を保存しない。学習目的で必要な場合も、mask 済みの要約のみを表示する。

## 9. KPI

| KPI | 内容 |
|---|---|
| 検出精度 / マスタ一致率 / 人間確認率 / 誤検知率 | system41 の主要KPI |
| risk_flag_count | risk flags の件数 |
| latency_ms | 処理時間の教材用値 |

KPI は初期MVPでは疑似値を返す。製造工程では固定入力に対して値が安定することをテストする。

## 10. エラー設計

| error_code | HTTP | 条件 |
|---|---|---|
| FastAPI request validation error | 422 | `input`がobjectでないなどrequest schemaに適合しない |
| system41_input_invalid | 400 | `mode`が`mock`, `lmstudio`以外など業務入力検証に失敗した |
| internal server error | 500 | JSON履歴の読込・保存失敗を含む想定外例外 |

秘密情報相当のキーは`***MASKED***`へ置換して処理を続ける。これはエラーresponseではなく、保存する`input`にマスク済みの値を記録する動作とする。

error response:

```json
{
  "detail": {
    "error_code": "system41_input_invalid",
    "message": "mode must be mock or lmstudio"
  }
}
```

## 11. Docker / LM Studio 接続

- backend / frontend / test は StudyAI 既存のDocker 構成に入れる。
- backendの`/app/backend/data`はホストの`./src/backend/data`へbind mountし、`system41_runs.json`をコンテナ再作成後も残す。
- LM Studio 本体はローカルアプリとして起動し、Docker からは host.docker.internal 経由で接続する。
- .env.docker では既存方式に合わせて LM_STUDIO_BASE_URL=http://host.docker.internal:5858/v1 を使う。
- LM Studio 未起動でもmode=mock で API、画面、テストが成立することを必須条件とする。

## 12. 製造時の検証コマンド

```bat
cd /d C:\work\work20260617\category\StudyAI
rtk docker compose -f docker-compose.yml build backend-test frontend
rtk docker compose -f docker-compose.yml run --rm backend-test python -m pytest -p asyncio -q tests/systems/test_enterprise_ai_systems.py
rtk docker run --rm studyai-frontend npm run build
```

Docker build / run を実行できない場合は、製造工程の検証記録へ未実行理由と代替検証を残す。

## 13. 製造タスク

- catalog.py に system41 定義を追加する。
- settings.py にsystem41のJSON履歴保存先を定義する。
- service.py に企業AI共通の mock decision engine・mask・KPI生成・audit生成とsystem41のJSON履歴保存・起動時復元を実装する。
- router.py で /api/system41/metadata, /api/system41/execute, /api/system41/runs を公開する。
- EnterpriseAiSystemPage.tsx で入力例、状態、商品照合、確認待ち、異常候補、人間確認結果、監査ログ、KPI、JSON保存状態を表示する。
- src/scripts/system41_enterprise_demo.py を追加する。
- test_enterprise_ai_systems.py で metadata / execute / runs / LM Studio失敗時の502とmock非代替 / mask / 再起動後の履歴復元を確認する。
