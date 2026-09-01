# System 38 詳細設計

## リアルタイム推薦・パーソナライズ

---

## 1. 実装配置

```text
backend/src/studyai/systems/enterprise_ai/
  __init__.py
  catalog.py
  service.py
  router.py
backend/src/studyai/common/config/settings.py
backend/data/enterprise_ai/system38_runs.json
frontend/src/pages/EnterpriseAiSystemPage.tsx
scripts/enterprise_ai_demo.py
scripts/system38_enterprise_demo.py
backend/tests/systems/test_enterprise_ai_systems.py
```

- system38 専用の物理ディレクトリは作らず、enterprise_ai 共通実装の catalog 差分として実装する。
- 既存の system01 から system37 の成果物は変更しない。
- LM Studio 本体は Docker 化せずローカル起動とし、Docker コンテナの backend から host.docker.internal の OpenAI互換APIへ接続できる構成を維持する。
- 初期MVPは外部AIが未起動でも動作するよう、決定ロジックは deterministic mock とサンプルデータで成立させる。
- 作成・更新するテキストファイルは UTF-8 BOMなしで保存する。

## 2. catalog 定義

catalog.py に system38 の設定を追加する。

| 項目 | 値 |
|---|---|
| system_id | system38 |
| title | リアルタイム推薦・パーソナライズ |
| pattern | 推薦・ランキング・パーソナライズ |
| default_input | 利用者、行動、商品、文脈、除外条件、実験、反応を含む教材用JSON |
| state_flow | collected / scored / ranked / displayed / feedback_recorded / retrained_candidate |
| kpi_definitions | click_through_rate / conversion_rate / diversity_score / freshness_score / latency_ms |
| risk_points | 過剰最適化 / 同質推薦 / 除外条件漏れ / 説明不足 |

default_input は秘密情報、個人情報、実決済情報を含めない。実企業システムそのものを再現するのではなく、業務判断、AI判断、承認、監査、評価の学習に必要な最小データへ限定する。

## 3. API 詳細

### 3.1 GET /api/system38/metadata

response:

```json
{
  "system_id": "system38",
  "title": "リアルタイム推薦・パーソナライズ",
  "pattern": "推薦・ランキング",
  "default_input": {},
  "state_flow": [],
  "kpi_definitions": [],
  "risk_points": []
}
```

### 3.2 POST /api/system38/execute

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
  "system_id": "system38",
  "state": "string",
  "result": {},
  "audit_log": [],
  "kpi_snapshot": {},
  "created_at": "ISO-8601",
  "storage": {
    "saved": true,
    "format": "json",
    "retention_limit": 20,
    "retained_runs": 1
  }
}
```

### 3.3 GET /api/system38/runs

response:

```json
{
  "runs": []
}
```

- /api/system38 は router.py の factory で生成し、StudyAI の main router へ登録する。
- ルート追加時は system37 から system44 をまとめて登録し、漏れがないことをテストで確認する。

## 4. request schema

| フィールド | 型 | 必須 | 内容 |
|---|---|---|---|
| input | object | yes | system別の教材入力。主項目は ユーザー属性、行動ログ、候補アイテム、実験条件 |
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
| system_id | string | system38 |
| state | string | catalogで定義した状態のいずれか |
| result.summary | string | 判断概要 |
| result.recommendations | array | 順位、商品、関心一致、関心点、鮮度点、合計点、在庫状態 |
| result.variant_assignment | object | 実験ID、利用者キー、割当variant |
| result.reaction_log | object | 反応ID、商品、反応、記録有無 |
| result.explanations | array | 判断理由 |
| result.risk_flags | array | 同質推薦などの注意点 |
| audit_log | array | 入力受付、判断元、完了の証跡 |
| kpi_snapshot | object | catalogで定義したKPI |
| storage | object | JSON保存有無、形式、上限、保存件数 |

## 6. 状態遷移

| from | event | to | 監査ログ |
|---|---|---|---|
| start | request accepted | collected | request_received |
| collected | score calculated | scored | decision_generated |
| scored | ranking completed | ranked | decision_generated |
| ranked | recommendation displayed | displayed | execution_completed |
| displayed | feedback recorded | feedback_recorded | execution_completed |
| any | LM Studio unavailable | error (HTTP 502) | runを保存しない |

画面では現在状態とcatalogで定義した状態の流れを表示する。

## 7. サービス処理

EnterpriseAiService.execute(system_id, payload) の処理内容:

1. catalog.py から system38 の定義を取得する。
2. request をvalidate し、秘密情報に見える値をmask する。
3. mode=lmstudio かつ接続情報がある場合は OpenAI互換API呼び出し候補を作る。
4. LM Studio が利用できない場合は処理を失敗させ、mock判断と実行履歴の保存を行わない。
5. 推薦・ランキング の教材観点に沿って result, audit_log, kpi_snapshot を生成する。
6. 推薦結果、variant割当、反応ログ、監査記録、KPIを一つのrunへまとめる。
7. 直近20件をUTF-8のJSONへ保存する。一時ファイルへ書いた後に履歴本体を置き換える。
8. 起動時はJSONから履歴を読み戻し、response schema に整形して返す。

## 8. 監査ログ

| 項目 | 型 | 内容 |
|---|---|---|
| timestamp | string | ISO-8601 |
| run_id | string | 実行単位ID |
| system_id | string | system38 |
| actor | string | operator または system |
| action | string | request_received, decision_generated, risk_flagged, execution_completed など |
| reason | string | 判断理由 |
| input_hash | string | 入力JSONの簡易ハッシュ |

監査ログには raw input 全文を保存しない。学習目的で必要な場合も、mask 済みの要約のみを表示する。

## 9. KPI

| KPI | 内容 |
|---|---|
| click_through_rate / conversion_rate | 反応と成果の教材用指標 |
| diversity_score / freshness_score | 推薦の多様性と鮮度の教材用指標 |
| risk_flag_count | risk flags の件数 |
| latency_ms | 処理時間の教材用値 |

KPI は初期MVPでは疑似値を返す。製造工程では固定入力に対して値が安定することをテストする。

## 10. エラー設計

| error_code | HTTP | 条件 |
|---|---|---|
| system38_not_found | 404 | catalog に system定義がない |
| system38_input_invalid | 400 | input がobject ではない |
| system38_unsafe_input_masked | 200 | 秘密情報相当の入力を mask して続行した |
| system38_execution_failed | 500 | 想定外例外 |

error response:

```json
{
  "error_code": "system38_input_invalid",
  "message": "input must be an object",
  "detail": {},
  "trace_id": "uuid"
}
```

## 11. Docker / LM Studio 接続

- backend / frontend / test は StudyAI 既存のDocker 構成に入れる。
- LM Studio 本体はローカルアプリとして起動し、Docker からは host.docker.internal 経由で接続する。
- .env.docker では既存方式に合わせて LM_STUDIO_BASE_URL=http://host.docker.internal:5858/v1 を使う。
- LM Studio 未起動でもmode=mock で API、画面、テストが成立することを必須条件とする。

## 12. 製造時の検証コマンド

```bat
docker compose -f docker-compose.yml build backend-test frontend
docker compose -f docker-compose.yml run --rm backend-test python -m pytest -p asyncio -q tests/systems/test_enterprise_ai_systems.py -k system38
docker compose -f docker-compose.yml run --rm frontend npm run build
```

Docker build / run を実行できない場合は、製造工程の検証記録へ未実行理由と代替検証を残す。

## 13. 製造タスク

- catalog.py に system38 定義を追加する。
- service.py に企業AI共通の mock decision engine・mask・KPI生成・audit生成を実装する。
- router.py で /api/system38/metadata, /api/system38/execute, /api/system38/runs を公開する。
- EnterpriseAiSystemPage.tsx で入力、状態、結果、監査ログ、KPIを表示する。
- settings.py と service.py でJSON履歴の保存先、再起動時の復元、直近20件の保持を実装する。
- src/scripts/system38_enterprise_demo.py を追加する。
- test_enterprise_ai_systems.py で metadata / execute / runs / LM Studio失敗時の502とmock非代替 / mask を確認する。
