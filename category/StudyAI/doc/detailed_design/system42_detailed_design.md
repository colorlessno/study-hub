# System 42 詳細設計

## 不正検知・異常検知AI

---

## 1. 実装配置

```text
backend/src/studyai/systems/enterprise_ai/
  __init__.py
  catalog.py
  service.py
  router.py
frontend/src/pages/EnterpriseAiSystemPage.tsx
scripts/enterprise_ai_demo.py
scripts/system42_enterprise_demo.py
backend/tests/systems/test_enterprise_ai_systems.py
```

- system42 専用の物理ディレクトリは作らず、enterprise_ai 共通実装の catalog 差分として実装する。
- 既存の system01 から system41 の成果物は変更しない。
- LM Studio 本体は Docker 化せずローカル起動とし、Docker コンテナの backend から host.docker.internal の OpenAI互換APIへ接続できる構成を維持する。
- 初期MVPは外部AIが未起動でも動作するよう、決定ロジックは deterministic mock とサンプルデータで成立させる。
- 作成・更新するテキストファイルは UTF-8 BOMなしで保存する。

## 2. catalog 定義

catalog.py に system42 の設定を追加する。

| 項目 | 値 |
|---|---|
| system_id | system42 |
| title | 不正検知・異常検知AI |
| pattern | 取引・行動ログのリスク検知 |
| default_input | 取引、通常時の傾向、端末、ログイン履歴、過去パターン、判定しきい値、確認結果、誤判定コストを含む教材用JSON |
| state_flow | scored / allowed / held / rejected / reviewed / false_positive / false_negative |
| kpi_definitions | 検知率、誤検知率、処理時間_ms、人間レビュー率 |
| risk_points | 個人情報の過剰収集、正常取引の誤ブロック、不正取引の見逃し、監査証跡不足 |

default_input は秘密情報、個人情報、実決済情報を含めない。実企業システムそのものを再現するのではなく、業務判断、AI判断、承認、監査、評価の学習に必要な最小データへ限定する。

## 3. API 詳細

### 3.1 GET /api/system42/metadata

response:

```json
{
  "system_id": "system42",
  "title": "不正検知・異常検知AI",
  "pattern": "取引・行動ログのリスク検知",
  "default_input": {},
  "state_flow": [],
  "kpi_definitions": [],
  "risk_points": []
}
```

### 3.2 POST /api/system42/execute

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
  "system_id": "system42",
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

### 3.3 GET /api/system42/runs

response:

```json
{
  "runs": []
}
```

- runs は新しい順に最大20件返す。
- StudyAIバックエンドの起動時に `data/enterprise_ai/system42_runs.json` を読み込み、再起動前に保存した履歴も返す。

- /api/system42 は router.py の factory で生成し、StudyAI の main router へ登録する。
- ルート追加時は system37 から system44 をまとめて登録し、漏れがないことをテストで確認する。

## 4. request schema

| フィールド | 型 | 必須 | 内容 |
|---|---|---|---|
| input | object | yes | system別の教材入力。主項目は 取引ログ、ログイン履歴、端末情報、金額、地域、過去パターン |
| mode | string | no | mock または lmstudio。初期値は mock |
| operator | string | no | 操作者。監査ログの actor に入れる |

validation:

- input がobject でない場合は 400 を返す。
- mode=lmstudio の場合でも、LM Studio 未接続時は mock へ明示的に fallback し、監査ログに記録する。
- 教材用途のため、API key、password、token、実カード番号に相当するキーが入力された場合は保存せず、mask する。

## 5. response / result schema

| フィールド | 型 | 内容 |
|---|---|---|
| run_id | string | 実行単位ID |
| system_id | string | system42 |
| state | string | scored / allowed / held / rejected / reviewed / false_positive / false_negative のいずれか |
| result.summary | string | 判断概要 |
| result.recommendations | array | 推奨、候補、検知、最適化案など |
| result.explanations | array | 判断理由 |
| result.risk_flags | array | 高リスク取引、要調査、正常取引の誤ブロック、不正取引の見逃しなどの注意点 |
| audit_log | array | 入力受付、判断、fallback、完了の証跡 |
| kpi_snapshot | object | 検知率、誤検知率、処理時間_ms、人間レビュー率 を含むKPI |
| storage | object | JSON保存の成否、保存形式、保存上限、保存件数 |

## 6. 状態遷移

| from | event | to | 監査ログ |
|---|---|---|---|
| start | リスク点が保留しきい値未満 | allowed | risk_decision_recorded |
| start | リスク点が保留しきい値以上、拒否しきい値未満 | held | risk_decision_recorded / risk_alert_recorded |
| start | リスク点が拒否しきい値以上 | rejected | risk_decision_recorded / risk_alert_recorded |
| held / rejected | 確認結果が正常取引 | false_positive | risk_review_recorded |
| allowed | 確認結果が不正取引 | false_negative | risk_review_recorded |
| allowed / held / rejected | 判定と実際の結果が一致 | reviewed | risk_review_recorded |
| any | LM Studio unavailable | current state | lmstudio_fallback_to_mock |

system42 の状態候補は scored / allowed / held / rejected / reviewed / false_positive / false_negative とし、画面では現在状態、次状態、終了状態を表示する。

## 7. サービス処理

EnterpriseAiService.execute(system_id, payload) の処理内容:

1. catalog.py から system42 の定義を取得する。
2. request をvalidate し、秘密情報に見える値をmask する。
3. mode=lmstudio かつ接続情報がある場合は OpenAI互換API呼び出し候補を作る。
4. LM Studio が利用できない場合は mock decision engine を使う。
5. リスク検知 の教材観点に沿って result, audit_log, kpi_snapshot を生成する。
6. 実行履歴を新しい順に直近20件へ制限し、`data/enterprise_ai/system42_runs.json` へUTF-8で保存する。
7. 一時ファイルへの書込みと置換が完了したことを確認し、保存状態を含むresponse schemaに整形して返す。

### 7.1 実行履歴の保存と復元

- 保存先は設定値 `system42_run_file` とし、既定値は `./data/enterprise_ai/system42_runs.json` とする。
- JSONは `ensure_ascii=False` のUTF-8で保存し、日本語をUnicodeエスケープへ置き換えない。
- 保存対象は実行結果、入力、監査ログ、KPI、保存状態を含む実行履歴全体とする。
- 保存前に一時ファイルへ書き込み、完了後に本ファイルへ置き換える。
- 起動時に既存JSONを読み込み、新しい順に最大20件をメモリへ復元する。
- JSONが配列でない、配列要素がobjectでない、UTF-8読込またはJSON解析に失敗した場合は起動時エラーとし、履歴なしとして処理を継続しない。
- 書込みまたは置換に失敗した場合はexecuteを成功扱いにしない。

## 8. 監査ログ

| 項目 | 型 | 内容 |
|---|---|---|
| timestamp | string | ISO-8601 |
| run_id | string | 実行単位ID |
| system_id | string | system42 |
| actor | string | operator または system |
| action | string | request_received, decision_generated, risk_flagged, execution_completed など |
| reason | string | 判断理由 |
| input_hash | string | 入力JSONの簡易ハッシュ |

監査ログには raw input 全文を保存しない。学習目的で必要な場合も、mask 済みの要約のみを表示する。

## 9. KPI

| KPI | 内容 |
|---|---|
| 検知率 / 誤検知率 / 処理時間_ms / 人間レビュー率 | system42 の主要KPI |
| risk_flag_count | risk flags の件数 |
| mock_fallback_count | mock fallback の発生数 |
| latency_ms | 処理時間の教材用値 |

KPI は初期MVPでは疑似値を返す。製造工程では固定入力に対して値が安定することをテストする。

## 10. 画面詳細

- 「拒否判定例」「通常取引例」「保留判定例」「誤検知例」「見逃し例」で、比較対象の入力JSONを設定する。
- 実行結果には根拠別の加点、リスク点、二つのしきい値、判定、アラート、確認結果、誤検知・見逃し、推定コストを表示する。
- 保存状態には `saved`, `format`, `retention_limit`, `retained_runs` を表示する。
- 実行履歴はGET `/api/system42/runs` の結果を表示し、選択した履歴の結果を再表示する。

## 11. エラー設計

| error_code | HTTP | 条件 |
|---|---|---|
| FastAPI request validation error | 422 | `input`がobjectでないなどrequest schemaに適合しない |
| system42_input_invalid | 400 | `mode`が`mock`, `lmstudio`以外など業務入力検証に失敗した |
| internal server error | 500 | JSON履歴の読込・保存失敗を含む想定外例外 |

error response:

```json
{
  "detail": {
    "error_code": "system42_input_invalid",
    "message": "mode must be mock or lmstudio"
  }
}
```

## 12. Docker / LM Studio 接続

- backend / frontend / test は StudyAI 既存のDocker 構成に入れる。
- LM Studio 本体はローカルアプリとして起動し、Docker からは host.docker.internal 経由で接続する。
- .env.docker では既存方式に合わせて LM_STUDIO_BASE_URL=http://host.docker.internal:5858/v1 を使う。
- LM Studio 未起動でもmode=mock で API、画面、テストが成立することを必須条件とする。

## 13. 製造時の検証コマンド

```bat
cd /d C:\work\work20260617\category\StudyAI
rtk docker compose -f docker-compose.yml build backend-test frontend
rtk docker run --rm studyai-backend-test python -m pytest -p asyncio -q tests/systems/test_enterprise_ai_systems.py
rtk docker run --rm studyai-frontend npm run build
```

Docker build / run を実行できない場合は、製造工程の検証記録へ未実行理由と代替検証を残す。

## 14. 製造タスク

- catalog.py に system42 定義を追加する。
- service.py に企業AI共通の mock decision engine・mask・KPI生成・audit生成を実装する。
- router.py で /api/system42/metadata, /api/system42/execute, /api/system42/runs を公開する。
- EnterpriseAiSystemPage.tsx で入力例、入力、状態、結果、保存状態、監査ログ、KPI、実行履歴を表示する。
- src/scripts/system42_enterprise_demo.py を追加する。
- test_enterprise_ai_systems.py で metadata / execute / runs / fallback / mask / JSON保存 / 直近20件 / 再起動後の復元を確認する。
