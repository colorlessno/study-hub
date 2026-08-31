# System 43 詳細設計

## 制約最適化AI

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
scripts/system43_enterprise_demo.py
backend/tests/systems/test_enterprise_ai_systems.py
```

- system43 専用の物理ディレクトリは作らず、enterprise_ai 共通実装の catalog 差分として実装する。
- 既存の system01 から system42 の成果物は変更しない。
- LM Studio 本体は Docker 化せずローカル起動とし、Docker コンテナの backend から host.docker.internal の OpenAI互換APIへ接続できる構成を維持する。
- 初期MVPは外部AIが未起動でも動作するよう、決定ロジックは deterministic mock とサンプルデータで成立させる。
- 作成・更新するテキストファイルは UTF-8 BOMなしで保存する。

## 2. catalog 定義

catalog.py に system43 の設定を追加する。

| 項目 | 値 |
|---|---|
| system_id | system43 |
| title | 制約最適化AI |
| pattern | 最適化・スケジューリング |
| default_input | タスク、担当者・時間枠、場所、優先度、制約条件、コスト関数 を含む教材用JSON |
| state_flow | drafted / optimized / violation_found / adjusted / accepted |
| kpi_definitions | 制約違反数、最適化コスト、処理時間_ms、人間調整率 |
| risk_points | 制約定義の漏れ、過最適化、人間調整なしの実行 |

default_input は秘密情報、個人情報、実決済情報を含めない。実企業システムそのものを再現するのではなく、業務判断、AI判断、承認、監査、評価の学習に必要な最小データへ限定する。

## 3. API 詳細

### 3.1 GET /api/system43/metadata

response:

```json
{
  "system_id": "system43",
  "title": "制約最適化AI",
  "pattern": "最適化・スケジューリング",
  "default_input": {},
  "state_flow": [],
  "kpi_definitions": [],
  "risk_points": []
}
```

### 3.2 POST /api/system43/execute

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
  "system_id": "system43",
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

### 3.3 GET /api/system43/runs

response:

```json
{
  "runs": []
}
```

- /api/system43 は router.py の factory で生成し、StudyAI の main router へ登録する。
- ルート追加時は system37 から system44 をまとめて登録し、漏れがないことをテストで確認する。

## 4. request schema

| フィールド | 型 | 必須 | 内容 |
|---|---|---|---|
| input | object | yes | system別の教材入力。主項目は タスク、担当者・時間枠、場所、優先度、制約条件、コスト関数 |
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
| system_id | string | system43 |
| state | string | drafted / optimized / violation_found / adjusted / accepted のいずれか |
| result.summary | string | 判断概要 |
| result.recommendations | array | 推奨、候補、検知、最適化案など |
| result.explanations | array | 判断理由 |
| result.risk_flags | array | 制約定義の漏れ、過最適化、人間調整なしの実行 に基づく注意点 |
| result.route_plan | array | 担当者ごとの開始位置、訪問順、距離、遅延、時間超過 |
| result.violations | array | 未割当、必須仕事不足、所要時間超過、距離超過、時間枠超過 |
| result.cost_summary | object | 距離、遅延、未割当、時間超過のコスト内訳と総コスト |
| result.adjustment_candidates | array | 制約違反ごとの調整候補 |
| result.human_adjustment_record | object | 調整ID、状態、調整者、割当内容、記録有無 |
| audit_log | array | 入力受付、判断、fallback、完了の証跡 |
| kpi_snapshot | object | 制約違反数、最適化コスト、処理時間_ms、人間調整率 を含むKPI |
| storage | object | JSON保存の成否、保存形式、保存上限、保存件数 |

## 6. 状態遷移

| from | event | to | 監査ログ |
|---|---|---|---|
| start | request accepted | drafted | request_received |
| drafted | 制約違反あり | violation_found | risk_flagged |
| drafted | 人間調整を適用 | adjusted | human_adjustment_recorded |
| drafted | 制約違反なし | accepted | execution_completed |
| any | LM Studio unavailable | current state | lmstudio_fallback_to_mock |

system43 の状態候補は drafted / optimized / violation_found / adjusted / accepted とし、画面では現在状態、次状態、終了状態を表示する。

## 7. サービス処理

EnterpriseAiService.execute(system_id, payload) の処理内容:

1. catalog.py から system43 の定義を取得する。
2. request をvalidate し、秘密情報に見える値をmask する。
3. mode=lmstudio かつ接続情報がある場合は OpenAI互換API呼び出し候補を作る。
4. LM Studio が利用できない場合は mock decision engine を使う。
5. 最適化・スケジューリング の教材観点に沿って result, audit_log, kpi_snapshot を生成する。
6. `data/enterprise_ai/system43_runs.json` へUTF-8で保存し、新しい順の直近20件だけを保持する。
7. `storage` に保存成否、形式、上限、保存件数を設定する。
8. response schema に整形して返す。

### 7.1 実行履歴の永続化

- バックエンド起動時に `system43_runs.json` が存在する場合は、保存済み履歴を読み込む。
- ファイルが存在しない場合は空の履歴として開始し、最初の実行時に親フォルダとファイルを作成する。
- JSONはUTF-8で保存し、同一ファイルへ直接書きかけの内容を残さないよう一時ファイルから置き換える。
- 保存件数は新しい順の直近20件とし、`GET /api/system43/runs` も同じ順序で返す。
- 保存に失敗した場合は実行失敗として扱い、保存成功を示す `storage` を画面へ返さない。
- バックエンド再起動後も、調整者と割当内容を含む `human_adjustment_record`、監査記録、評価指標を復元する。

## 8. 監査ログ

| 項目 | 型 | 内容 |
|---|---|---|
| timestamp | string | ISO-8601 |
| run_id | string | 実行単位ID |
| system_id | string | system43 |
| actor | string | operator または system |
| action | string | request_received, decision_generated, risk_flagged, execution_completed など |
| reason | string | 判断理由 |
| input_hash | string | 入力JSONの簡易ハッシュ |

監査ログには raw input 全文を保存しない。学習目的で必要な場合も、mask 済みの要約のみを表示する。

## 9. KPI

| KPI | 内容 |
|---|---|
| 制約違反数 / 最適化コスト / 処理時間_ms / 人間調整率 | system43 の主要KPI |
| risk_flag_count | risk flags の件数 |
| mock_fallback_count | mock fallback の発生数 |
| latency_ms | 処理時間の教材用値 |

KPI は初期MVPでは疑似値を返す。製造工程では固定入力に対して値が安定することをテストする。

## 10. エラー設計

| error_code | HTTP | 条件 |
|---|---|---|
| FastAPI request validation error | 422 | `input`がobjectでないなどrequest schemaに適合しない |
| system43_input_invalid | 400 | `mode`が`mock`, `lmstudio`以外など業務入力検証に失敗した |
| internal server error | 500 | JSON履歴の読込・保存失敗を含む想定外例外 |

error response:

```json
{
  "detail": {
    "error_code": "system43_input_invalid",
    "message": "mode must be mock or lmstudio"
  }
}
```

## 11. Docker / LM Studio 接続

- backend / frontend / test は StudyAI 既存のDocker 構成に入れる。
- LM Studio 本体はローカルアプリとして起動し、Docker からは host.docker.internal 経由で接続する。
- .env.docker では既存方式に合わせて LM_STUDIO_BASE_URL=http://host.docker.internal:5858/v1 を使う。
- LM Studio 未起動でもmode=mock で API、画面、テストが成立することを必須条件とする。

## 12. 製造時の検証コマンド

```bat
cd /d C:\work\work20260617\category\StudyAI
rtk docker compose -f docker-compose.yml build backend-test frontend
rtk docker run --rm studyai-backend-test python -m pytest -p asyncio -q tests/systems/test_enterprise_ai_systems.py
rtk docker run --rm studyai-frontend npm run build
```

Docker build / run を実行できない場合は、製造工程の検証記録へ未実行理由と代替検証を残す。

## 13. 製造タスク

- catalog.py に system43 定義を追加する。
- service.py に企業AI共通の mock decision engine・mask・KPI生成・audit生成を実装する。
- router.py で /api/system43/metadata, /api/system43/execute, /api/system43/runs を公開する。
- EnterpriseAiSystemPage.tsx で入力例、状態、割当、ルート、制約違反、コスト、調整候補、監査記録、KPI、保存状態、実行履歴を表示する。
- src/scripts/system43_enterprise_demo.py を追加する。
- test_enterprise_ai_systems.py で metadata / execute / runs / fallback / mask / JSON保存 / 再起動後の復元を確認する。
