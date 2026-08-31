# System 39 詳細設計

## 業務実行型カスタマーサポートAI

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
scripts/system39_enterprise_demo.py
backend/tests/systems/test_enterprise_ai_systems.py
```

- system39 専用の物理ディレクトリは作らず、enterprise_ai 共通実装の catalog 差分として実装する。
- 既存の system01 から system38 の成果物は変更しない。
- LM Studio 本体は Docker 化せずローカル起動とし、Docker コンテナの backend から host.docker.internal の OpenAI互換APIへ接続できる構成を維持する。
- 初期MVPは外部AIが未起動でも動作するよう、決定ロジックは deterministic mock とサンプルデータで成立させる。
- 作成・更新するテキストファイルは UTF-8 BOMなしで保存する。

## 2. catalog 定義

catalog.py に system39 の設定を追加する。

| 項目 | 値 |
|---|---|
| system_id | system39 |
| title | 業務実行型カスタマーサポートAI |
| pattern | 問い合わせ・手続き |
| default_input | 問い合わせ文、顧客状態、注文情報、FAQ、本人確認結果 を含む教材用JSON |
| state_flow | received / classified / verification_required / answered / processed / escalated / closed |
| kpi_definitions | 解決率、エスカレーション率、応答時間_ms、本人確認失敗率 |
| risk_points | 本人確認省略、個人情報混入、誤った手続き実行 |

default_input は秘密情報、個人情報、実決済情報を含めない。実企業システムそのものを再現するのではなく、業務判断、AI判断、承認、監査、評価の学習に必要な最小データへ限定する。

## 3. API 詳細

### 3.1 GET /api/system39/metadata

response:

```json
{
  "system_id": "system39",
  "title": "業務実行型カスタマーサポートAI",
  "pattern": "問い合わせ・手続き",
  "default_input": {},
  "state_flow": [],
  "kpi_definitions": [],
  "risk_points": []
}
```

### 3.2 POST /api/system39/execute

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
  "system_id": "system39",
  "state": "string",
  "result": {},
  "audit_log": [],
  "kpi_snapshot": {},
  "created_at": "ISO-8601"
}
```

### 3.3 GET /api/system39/runs

response:

```json
{
  "runs": []
}
```

- /api/system39 は router.py の factory で生成し、StudyAI の main router へ登録する。
- ルート追加時は system37 から system44 をまとめて登録し、漏れがないことをテストで確認する。

## 4. request schema

| フィールド | 型 | 必須 | 内容 |
|---|---|---|---|
| input | object | yes | system別の教材入力。主項目は 問い合わせ文、顧客状態、注文情報、FAQ、本人確認結果 |
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
| system_id | string | system39 |
| state | string | received / classified / verification_required / answered / processed / escalated / closed のいずれか |
| result.summary | string | 判断概要 |
| result.recommendations | array | 推奨、候補、検知、最適化案など |
| result.explanations | array | 判断理由 |
| result.risk_flags | array | 本人確認省略、個人情報混入、誤った手続き実行 に基づく注意点 |
| audit_log | array | 入力受付、判断、fallback、完了の証跡 |
| kpi_snapshot | object | 解決率、エスカレーション率、応答時間_ms、本人確認失敗率 を含むKPI |

## 6. 状態遷移

| from | event | to | 監査ログ |
|---|---|---|---|
| start | request accepted | received | request_received |
| received | mock decision completed | classified | decision_generated |
| classified | risk found | verification_required | risk_flagged |
| classified | no blocking risk | answered | execution_completed |
| any | LM Studio unavailable | current state | lmstudio_fallback_to_mock |

system39 の状態候補は received / classified / verification_required / answered / processed / escalated / closed とし、画面では現在状態、次状態、終了状態を表示する。

## 7. サービス処理

EnterpriseAiService.execute(system_id, payload) の処理内容:

1. catalog.py から system39 の定義を取得する。
2. request をvalidate し、秘密情報に見える値をmask する。
3. mode=lmstudio かつ接続情報がある場合は OpenAI互換API呼び出し候補を作る。
4. LM Studio が利用できない場合は mock decision engine を使う。
5. 問い合わせ・手続き の教材観点に沿って result, audit_log, kpi_snapshot を生成する。
6. 手続き受付、チケット、引継ぎ、監査記録、KPIを含む実行結果を `system39_runs.json` へ保存する。
7. response schema に整形して返す。

## 8. 保存・監査ログ

- 保存先は `SYSTEM39_RUN_FILE` で指定し、既定値は `./data/enterprise_ai/system39_runs.json` とする。
- UTF-8のJSON配列で直近20件を保持する。
- 一時ファイルへ書き込んでから保存先へ置換する。
- 起動時に保存済み履歴を読み込み、`GET /api/system39/runs` と画面の実行履歴へ復元する。
- 保存形式が不正な場合は黙って初期化せず、起動時にエラーとして報告する。

| 項目 | 型 | 内容 |
|---|---|---|
| timestamp | string | ISO-8601 |
| run_id | string | 実行単位ID |
| system_id | string | system39 |
| actor | string | operator または system |
| action | string | request_received, decision_generated, risk_flagged, execution_completed など |
| reason | string | 判断理由 |
| input_hash | string | 入力JSONの簡易ハッシュ |

監査ログには raw input 全文を保存しない。学習目的で必要な場合も、mask 済みの要約のみを表示する。

## 9. KPI

| KPI | 内容 |
|---|---|
| 解決率 / エスカレーション率 / 応答時間_ms / 本人確認失敗率 | system39 の主要KPI |
| risk_flag_count | risk flags の件数 |
| mock_fallback_count | mock fallback の発生数 |
| latency_ms | 処理時間の教材用値 |

KPI は初期MVPでは疑似値を返す。製造工程では固定入力に対して値が安定することをテストする。

## 10. エラー設計

| error_code | HTTP | 条件 |
|---|---|---|
| system39_not_found | 404 | catalog に system定義がない |
| system39_input_invalid | 400 | input がobject ではない |
| system39_unsafe_input_masked | 200 | 秘密情報相当の入力を mask して続行した |
| system39_execution_failed | 500 | 想定外例外 |

error response:

```json
{
  "error_code": "system39_input_invalid",
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
rtk docker compose -f docker-compose.yml run --rm backend-test python -m pytest -p asyncio -q tests/systems/test_enterprise_ai_systems.py
rtk docker run --rm studyai-frontend npm run build
rtk docker compose -f docker-compose.yml build backend-test frontend
```

Docker build / run を実行できない場合は、製造工程の検証記録へ未実行理由と代替検証を残す。

## 13. 製造タスク

- catalog.py に system39 定義を追加する。
- service.py に企業AI共通の mock decision engine・mask・KPI生成・audit生成を実装する。
- settings.py と service.py に system39 のJSON保存先、保存、起動時復元を実装する。
- router.py で /api/system39/metadata, /api/system39/execute, /api/system39/runs を公開する。
- EnterpriseAiSystemPage.tsx で比較例、入力、状態、結果、監査ログ、KPI、保存状態、復元済み履歴を表示する。
- src/scripts/system39_enterprise_demo.py を追加する。
- test_enterprise_ai_systems.py で metadata / execute / runs / fallback / mask / JSON保存 / 再起動復元を確認する。
