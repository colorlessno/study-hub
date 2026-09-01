# System 14 詳細設計

## 顧客接点データ 全量分析・インサイト配信エージェント

---

## 1. 実装ディレクトリ構造

```text
backend/src/studyai/
├── system14_main.py
└── systems/system14/
    ├── api/router.py
    ├── models/insight.py
    ├── schemas/insight.py
    ├── repositories/insight_repository.py
    ├── services/job_manager.py
    ├── services/speech_to_text_service.py
    ├── services/speaker_diarization_service.py
    ├── services/utterance_analyzer.py
    ├── services/llm_analysis_pipeline.py
    ├── services/grouping_service.py
    ├── services/sales_scoring_service.py
    ├── services/insight_query_service.py
    ├── services/dummy_crm_service.py
    ├── services/delivery_sandbox_service.py
    ├── services/workflow_dispatcher.py
    ├── services/agent_chat_service.py
    ├── services/ingestion_normalizer.py
    ├── services/pii_masker.py
    └── prompts/insight_prompt.py

frontend/src/pages/System14Page.tsx
backend/alembic/versions/20260421_0016_init_system14.py
backend/alembic/versions/20260422_0017_add_system14_workflow_delivery_logs.py
backend/alembic/versions/20260901_0019_add_system14_dummy_crm.py
backend/alembic/versions/20260901_0022_add_system14_webhook_receipts.py
```

## 2. モジュール詳細

| モジュール | 役割 | 主な関数 |
|---|---|---|
| `api/router.py` | System14 API ルーティング | `upload_data()`, `get_job()`, `get_dashboard()` |
| JobManager | ジョブ進捗管理 | `upload_data()`, `process_job()`, `get_job()` |
| IngestionNormalizer | CSV / JSON / text 正規化 | `normalize_text_file()`, `normalize_transcript()` |
| SpeechToTextService | 音声/動画書き起こし | `transcribe_with_speakers()` |
| SpeakerDiarizationService | ローカル話者分離と匿名話者区間抽出 | `diarize()`, `assign_speakers()` |
| UtteranceAnalyzer | 発話分析 | `analyze_utterance()` |
| LLMAnalysisPipeline | LM Studio・LangGraph発話分析 | `analyze_utterance()` |
| GroupingService | 意味グルーピング | `build_groups()` |
| SalesScoringService | 営業会話評価 | `score_sales_conversation()` |
| InsightQueryService | dashboard / insight API 提供 | `get_dashboard()`, `get_voice_ranking()`, `get_sales_score()` |
| WorkflowDispatcher | workflow 定義保存・リスク即時通知・配信ペイロード生成・配信ログ保存 | `create_workflow()`, `dispatch_risk_alerts()`, `list_delivery_logs()` |
| DeliverySandboxService | 配信設定状態、Webhook受信・履歴、Mailpitメール一覧 | `get_configuration()`, `receive_webhook()`, `list_webhook_receipts()`, `list_email_messages()` |
| AgentChatService | 自然語 Q&A | `answer_agent_query()` |
| PIIMasker | DB 保存前の簡易マスキング | `mask()`, `mask_metadata()` |
| DummyCrmService | 顧客対応履歴の登録・一覧・個別取得・更新 | `upsert_activity()`, `list_activities()`, `get_activity()`, `update_activity()` |
| PerformanceService | 合成会話の既存取込経路による性能計測・履歴取得 | `run()`, `list_runs()` |

## 2.1 実装状況（2026-09-01）

- MVP は実装済み。
- Docker サービス `system14` は `18014:8014` で起動する。
- Alembic revision は `20260901_0022`。
- Frontend は `/system14` route で、データ取込、ダッシュボード、分析、エージェント、RAG・FAQ、ダミーCRMの6タブ構成。
- workflow は作成時に配信ペイロードを生成し、dashboard / webhook / email / ローカル・ダミーCRM / 実CRMの配信結果を `system14_workflow_delivery_logs` に保存する。`realtime` workflowは取込元が一致する緊急度`high`の発話をconversation保存直後に通知し、同じテーブルへ結果を保存する。
- `crm_dummy`は同一バックエンド内のダミーCRM APIへBearer認証付きHTTP POSTを行い、`system14_dummy_crm_activities`へ永続化する。
- 音声・動画はfaster-whisperの各区間から開始秒・終了秒を取得後、永続volume上の`pyannote/speaker-diarization-community-1`をローカル実行する。文字起こし区間と話者区間の重なりが最大の匿名ラベルをDBへ保存して取込画面へ表示する。重なりがない区間だけを`unknown`とし、匿名ラベルから顧客・担当者を推測しない。Salesforce等の実CRM connectorは接続環境未提供を明示する。

## 3. API 詳細

- `POST /data/upload`
  - 1ファイルの取込、正規化、匿名化、分析、DB保存を要求内で順番に実行
  - `JobManager`のクラス共通ロックでAPI要求を受付順に処理し、別インスタンスからの取込も1件ずつ実行
  - 処理後にDBへ保存した`completed`または`failed`をそのまま応答の`status`へ設定
  - `file`, `data_type`, `source`, `metadata`
- `GET /jobs/{job_id}`
- `GET /jobs/{job_id}/utterances`
- `POST /performance/runs`
- `GET /performance/runs`
- `GET /insights/voice-ranking`
- `GET /insights/sales-score`
- `GET /insights/win-loss`
- `POST /workflows`
- `GET /delivery/configuration`
- `POST /delivery-sandbox/webhook`
- `GET /delivery-sandbox/webhook-receipts`
- `GET /delivery-sandbox/email-messages`
- `GET /dashboard`
- `POST /agent/chat`
- `GET /agent/action-proposals`
- `GET /agent/faq-gaps`
- `POST /dummy-crm/activities`
- `GET /dummy-crm/activities`
- `GET /dummy-crm/activities/{activity_id}`
- `PATCH /dummy-crm/activities/{activity_id}`
- `POST /knowledge/faqs`
- `GET /knowledge/faqs`
- `POST /knowledge/index`

## 4. 詳細API I/O 定義

### 4.1 POST `/data/upload`

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `file` | binary | ○ | 音声 / 動画 / テキスト |
| `data_type` | string | ○ | audio / video / chat / email / call_log |
| `source` | string | ○ | データ出所 |
| `metadata` | object |  | 担当者・商品・日付など |
| `analysis_mode` | string |  | `rules`（既定）または`llm` |

**レスポンス項目**

| 項目 | 型 | 説明 |
|---|---|---|
| `job_id` | string | ジョブID |
| `status` | string | completed / failed |
| `estimated_minutes` | integer | 完了応答のため0 |
| `file_count` | integer | 対象件数 |

音声・動画ではfaster-whisperの文字起こし後にpyannote話者分離を順番に実行する。各文字起こし区間を話者区間と一件ずつ比較し、時刻の重なりが最大の匿名ラベルを`speaker`、文字起こしの実区間秒を`start_sec`と`end_sec`へ入れて`system14_utterances`へ保存する。重なりがない区間は`speaker=unknown`とする。モデル未配置・読込み失敗・推論失敗はジョブを`failed`にし、全区間`unknown`への自動切替は行わない。

### 4.1.1 GET `/jobs/{job_id}/utterances`

取込ジョブに保存された発話を、conversation IDとutterance IDの昇順で返す。各発話は`id`、`conversation_id`、`speaker`、`text`、`start_sec`、`end_sec`を持つ。存在しないジョブは404を返す。

### 4.1.2 性能検証API

**対象API**: `POST /performance/runs`, `GET /performance/runs`

- `conversation_count`は100～5000、`target_seconds`は1～600とする。
- `PerformanceService`は番号付きの合成会話を入力順に生成し、`analysis_mode=rules`、`source=performance_validation`として既存の`JobManager.upload_data()`へ一度渡す。
- 合成文には個人情報と緊急語を含めない。LM Studio、Webhook、SMTP、CRMには送信しない。
- `JobManager`の共通ロック、正規化、マスク、ルール分析、conversation・utterance・sales score・insight group保存を通常取込と共有する。
- 取込完了後に対象jobの会話数と発話数をDBから数え、経過秒、会話/秒、目標達成、job ID、失敗理由を`system14_performance_runs`へ保存する。
- 実行APIはadminまたはmanagerロール、履歴APIは認証済み利用者を許可する。

### 4.2 GET `/jobs/{job_id}` / GET `/dashboard`

| 項目 | 型 | 説明 |
|---|---|---|
| `job_id` | string | ジョブ識別子 |
| `status` | string | queued / running / completed / failed |
| `progress` | integer | 進捗率 |
| `dashboard_cards` | object[] | 主要KPI |

### 4.3 インサイトAPI

**対象API**: `GET /insights/voice-ranking`, `GET /insights/sales-score`, `GET /insights/win-loss`

| 項目 | 型 | 説明 |
|---|---|---|
| `from_date` / `to_date` | string(date) | 対象期間 |
| `product`, `call_reason`, `sentiment`, `type` | string | 絞り込み条件 |
| `ranking[]` | object[] | 顧客の声ランキング |
| `scores[]` | object[] | 営業スコア |
| `win_loss[]` | object[] | 受注失注分析 |

### 4.4 ワークフロー / 分析AI API

**対象API**: `POST /workflows`, `GET /workflows/delivery-logs`, `POST /agent/chat`, `GET /agent/action-proposals`, `GET /agent/faq-gaps`

| 項目 | 型 | 説明 |
|---|---|---|
| `name`, `trigger`, `data_sources[]`, `analysis_steps[]` | mixed | ワークフロー定義 |
| `delivery_result` | object | 配信ログID・配信方法・宛先・成功・失敗・skip・エラー内容 |
| `logs[]` | object[] | workflow名・trigger・配信方法・宛先・ペイロード・応答・エラー・配信日時 |
| `question` | string | AIへの質問 |
| `filters` | object | 対象条件 |
| `answer` | string | 根拠付き回答 |
| `recommended_actions[]` | object[] | 改善施策 |
| `faq_gaps[]` | object[] | 不足FAQ候補 |
| `use_rag` | boolean | trueの場合だけLM Studio・pgvectorを使う |
| `rag_limit` | integer | RAG根拠数。1から10 |
| `evidence.rag_sources[]` | object[] | source_type、source_key、title、product、similarity |

### 4.5 ローカル・ダミーCRM API

**対象API**: `POST /dummy-crm/activities`, `GET /dummy-crm/activities`, `GET /dummy-crm/activities/{activity_id}`, `PATCH /dummy-crm/activities/{activity_id}`

| 項目 | 型 | 説明 |
|---|---|---|
| `external_id` | string | workflow単位の重複防止キー。POST再送時は既存行を更新する |
| `customer_id`, `customer_name` | string | 顧客識別情報 |
| `contact_type` | string | voice_ranking / sales_score等の登録種別 |
| `summary` | string | CRMへ登録する分析要約 |
| `sentiment` | string/null | positive / negative / neutral |
| `urgency` | string | low / normal / high |
| `assigned_to` | string/null | 対応担当者 |
| `next_action` | string/null | 推奨する次の対応 |
| `status` | string | open / in_progress / completed |
| `source_payload` | object | 変換前のworkflow分析ペイロード |

`POST`だけは`SYSTEM14_DUMMY_CRM_TOKEN`と一致するBearer Tokenを必須とする。画面からの`GET`と`PATCH`はStudyAIの既存ユーザー認証・権限を使用する。

### 4.5.1 ローカル配信確認API

**対象API**: `GET /delivery/configuration`, `POST /delivery-sandbox/webhook`, `GET /delivery-sandbox/webhook-receipts`, `GET /delivery-sandbox/email-messages`

- 設定APIは利用可否、Webhook URL、SMTP接続先、Mailpit画面URLだけを返し、Tokenとパスワードを応答に含めない。
- Webhook受信APIは`SYSTEM14_WEBHOOK_BEARER_TOKEN`のBearer認証を行い、JSONを`system14_webhook_receipts`へ保存してから応答する。
- WorkflowDispatcherは送信先が`SYSTEM14_WEBHOOK_SINK_ENDPOINT`と完全一致する場合だけ専用Bearer Tokenを付ける。別のWebhook URLへTokenを送信しない。
- Email配信は`SYSTEM14_SMTP_HOST`へSMTPで実送信する。メール一覧APIは`SYSTEM14_MAILPIT_API_URL`を一度呼び出し、受信メールを画面用形式へ変換する。

### 4.6 RAG・FAQ API

**対象API**: `POST /knowledge/faqs`, `GET /knowledge/faqs`, `POST /knowledge/index`

- FAQ登録時は質問と回答を1件の文書としてLM Studioへ送信し、768次元Embeddingと本文を`system14_knowledge_entries`へ保存する。
- 索引更新時は`system14_utterances`、`system14_sales_scores`、`completed`の`system14_dummy_crm_activities`をそれぞれID順に処理する。複数件を同時送信しない。
- 同一`source_key`で本文・商品・metadataが変わらずEmbeddingが存在する場合だけ再索引を省略する。
- RAG回答時は質問をEmbedding化し、pgvectorのcosine distanceでFAQ、発話、営業スコア、完了済みCRM対応を検索する。取得した本文と同一`session_id`の直近5件の質問応答だけをLLMへ渡し、回答と推奨行動をJSONで検証する。
- FAQ不足検出は保存済みFAQの商品が対象商品と矛盾しないことを確認し、正規化した問い合わせトピックがFAQの質問または回答に含まれる場合、そのトピックを不足候補から除外する。
- Embedding、DB検索、LLM応答のいずれかが失敗した場合はエラーを返す。キーワード検索、固定文、構造化集計回答へ自動切替しない。

## 5. 入力チェック仕様

| 対象 | チェック項目 | ルール |
|---|---|---|
| `POST /data/upload` | `file`,`data_type`,`source` | 必須 |
| `POST /data/upload` | `data_type` | 許可値のみ |
| インサイトAPI | 日付範囲 | 前後関係確認 |
| `POST /workflows` | 配信定義 | `delivery` 必須 |
| `POST /agent/chat` | `question` | 空文字不可 |
| `POST /dummy-crm/activities` | `Authorization` | Bearer Token必須 |
| `POST /dummy-crm/activities` | `external_id`,`summary` | 必須 |
| `PATCH /dummy-crm/activities/{activity_id}` | 更新項目 | 1項目以上必須 |
| `POST /performance/runs` | `conversation_count` | 100～5000の整数 |
| `POST /performance/runs` | `target_seconds` | 1～600の数値 |

## 6. エラー応答仕様

共通レスポンス形式:

```json
{"error_code":"string","message":"string","details":{},"trace_id":"string"}
```

| error_code | HTTP | 発生条件 |
|---|---|---|
| `unsupported_source_data` | 400 | データ種別不正 |
| `job_not_found` | 404 | ジョブ不存在 |
| `workflow_invalid` | 400 | ワークフロー定義不正 |
| `agent_query_failed` | 500 | 分析AI応答失敗 |
| `dummy_crm_not_configured` | 503 | ダミーCRM Token未設定 |
| `dummy_crm_authentication_failed` | 401 | Bearer Token不一致 |
| `dummy_crm_activity_not_found` | 404 | 顧客対応履歴不存在 |

## 7. バリデーション一覧

| 対象 | ルール | 不正時挙動 |
|---|---|---|
| `sentiment` | positive/negative/neutral のみ | 422 を返す |
| `listening_ratio` | 0.0〜1.0 | 422 を返す |
| `limit` | 1以上 | 400 を返す |
| `delivery.method` | 許可方式のみ | 保存拒否 |
| `dummy CRM status` | open/in_progress/completedのみ | 422を返す |
| `dummy CRM urgency` | low/normal/highのみ | 422を返す |

## 8. データベース詳細

実装は他のSystemとの衝突を避けるため、すべて `system14_` prefix のテーブル名を使用する。

### 8.1 `system14_data_jobs`

- `id`, `data_type`, `source`, `file_path`, `metadata`, `status`, `progress`, `error_message`, `created_at`, `completed_at`

### 8.2 `system14_conversations`

- `id`, `job_id`, `data_type`, `source`, `transcript`, `summary`, `metadata`, `occurred_at`, `created_at`

### 8.3 `system14_utterances`

- `conversation_id`, `speaker`, `text`, `sentiment`, `sentiment_score`, `utterance_type`, `topics`, `urgency`, `embedding`, `start_sec`, `end_sec`

### 8.4 `system14_insight_groups`

- `label`, `sentiment`, `utterance_type`, `count`, `products`, `representative_text`, `period_from`, `period_to`, `utterance_ids`

### 8.5 `system14_sales_scores`

- `conversation_id`, `staff_id`, `staff_name`, `overall_score`, `issue_exploration`, `proposal_quality`, `next_step_clarity`, `listening_ratio`, `top_questions`

### 8.6 `system14_workflows`

- `name`, `trigger`, `data_sources`, `analysis_steps`, `output_type`, `filters`, `delivery`, `is_active`

### 8.7 `system14_workflow_delivery_logs`

- `workflow_id`, `method`, `destination`, `status`, `payload`, `response`, `error_message`, `delivered_at`, `created_at`

### 8.8 `system14_agent_answers`

- `session_id`, `question`, `answer`, `filters`, `recommended_actions`, `evidence`, `related_links`

### 8.9 `system14_dummy_crm_activities`

- `external_id`, `customer_id`, `customer_name`, `contact_type`, `summary`, `sentiment`, `urgency`, `assigned_to`, `next_action`, `follow_up_at`, `status`, `source_payload`, `created_at`, `updated_at`
- `external_id`はunique制約を持ち、同じworkflowの再送で重複行を作らない

### 8.10 `system14_knowledge_entries`

- `source_type`, `source_key`, `title`, `content`, `product`, `metadata`, `embedding`, `is_active`, `created_at`, `updated_at`
- `source_key`はunique制約を持つ。`source_type`は`faq`、`utterance`、`sales_score`、`crm_history`だけを許可する
- `embedding`は768次元で、cosine distance検索用のpgvector ivfflat indexを持つ

### 8.11 `system14_performance_runs`

- `job_id`, `requested_conversations`, `processed_conversations`, `processed_utterances`, `target_seconds`, `elapsed_seconds`, `conversations_per_second`, `status`, `target_met`, `error_message`, `created_at`, `completed_at`
- `job_id`は`system14_data_jobs`を参照し、取込ジョブ削除時はNULLにする。`status`は`completed`または`failed`だけを許可する

### 8.12 `system14_webhook_receipts`

- `id`, `payload`, `received_at`
- ローカルWebhookへ実際に到達したJSONをそのまま保存し、`received_at`の降順で表示する

## 9. AI 処理詳細

- 区間時刻付き書き起こし後に、ローカルpyannote話者分離を一度実行し、区間の最大重なりで匿名話者ラベルを割り当てる。重なりがない場合だけ`unknown`のまま保存する
- 匿名話者ラベルを顧客・担当者へ推測で変換しない。モデル未配置・読込み失敗・推論失敗を成功扱いや`unknown`へ自動切替しない
- `rules`は既存のキーワード規則を使い、`llm`は個人情報マスク後の発話を入力順に一件ずつLM Studioへ送る
- `llm`はLangGraphの`request_llm`ノード完了後に`validate_output`ノードを実行し、複数発話を同時送信しない
- LLM応答のsentiment、sentiment_score、utterance_type、topics、urgencyが契約に違反した場合は取込ジョブをfailedにし、ルール分析へ自動切替しない
- 発話ごとに `sentiment`, `type`, `topics` を付与する
- 改善案は「課題」「根拠件数」「推奨アクション」「配信先部門」を必須にする

## 10. 順次取込・配信設計

- 取込ジョブは要求内で `queued -> running -> completed / failed` の順に進め、完了後に応答する
- workflow は topic、sentiment、source、score 条件で配信を制御する
- workflow 作成時に `output_type` に応じた分析データを生成し、`dashboard` はログ保存、`webhook` は HTTP POST、`email` は SMTP 設定時のみ送信、`crm` は未対応として failed log を残す
- ローカルWebhookとMailpitを一件ずつ順番に操作し、WebhookはPostgreSQL、メールはMailpit volumeへ受信結果を保存する
- `crm_dummy`は`SYSTEM14_DUMMY_CRM_ENDPOINT`へBearer認証付きHTTP POSTを1件ずつ送り、成功・失敗と応答本文を配信ログへ保存する
- 取込処理はconversationと発話を保存後、緊急度`high`の発話だけを抽出する。対象がある場合は有効な`realtime` workflowをID順に読み、取込元が`data_sources`に一致する設定だけを一件ずつ配信する
- リスク通知ペイロードはjob ID、conversation ID、取込元、マスク済みmetadata、発話ID、話者、本文、感情、種別、トピック、緊急度、開始秒、終了秒を保持し、`output.type=risk_alert`で通常配信と区別する
- dashboard、Webhook、SMTP、ダミーCRMへの通知成否は取込ジョブと同じtransaction内の配信ログへ保存する。外部送信失敗はfailed logとして残し、後続workflowの実行と分析結果の保存を継続する
- ダミーCRM APIは`external_id`で登録済みデータを確認し、新規登録または更新を行ってから応答する
- `agent/chat` は分析済みデータと`system14_knowledge_entries`だけを参照し、取込元ファイルを再走査しない

## 11. DDL

DDL の正本は `src/backend/alembic/versions/20260421_0016_init_system14.py`から`src/backend/alembic/versions/20260901_0022_add_system14_webhook_receipts.py`までのAlembic migrationとする。概要は以下。

| テーブル | 主な制約・index |
|---|---|
| `system14_data_jobs` | `chk_system14_data_jobs_status`, `created_at`, `status`, `source` index |
| `system14_conversations` | `job_id` FK, `job_id`, `source`, `occurred_at` index |
| `system14_utterances` | `conversation_id` FK, sentiment check, `conversation_id`, `sentiment`, `utterance_type` index, pgvector ivfflat index |
| `system14_insight_groups` | `period_from/period_to`, `sentiment`, `utterance_type` index |
| `system14_sales_scores` | `conversation_id` FK, `listening_ratio BETWEEN 0 AND 1`, `conversation_id`, `staff_id` index |
| `system14_workflows` | `is_active` index |
| `system14_workflow_delivery_logs` | `workflow_id` FK, status check, `workflow_id`, `status`, `created_at` index |
| `system14_agent_answers` | `session_id`, `created_at` index |
| `system14_dummy_crm_activities` | `external_id` unique, status/urgency/sentiment check, `status`, `updated_at` index |
| `system14_knowledge_entries` | `source_key` unique, source_type check, `source_type`, `product`, pgvector ivfflat index |
| `system14_performance_runs` | `job_id` FK、status・要求件数check、`created_at` index |
| `system14_webhook_receipts` | `received_at` index |

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- 主要テーブル
CREATE TABLE system14_data_jobs (...);
CREATE TABLE system14_conversations (...);
CREATE TABLE system14_utterances (... embedding vector(768) ...);
CREATE TABLE system14_insight_groups (...);
CREATE TABLE system14_sales_scores (...);
CREATE TABLE system14_workflows (...);
CREATE TABLE system14_workflow_delivery_logs (...);
CREATE TABLE system14_agent_answers (...);
CREATE TABLE system14_dummy_crm_activities (...);
CREATE TABLE system14_knowledge_entries (... embedding vector(768) ...);
CREATE TABLE system14_performance_runs (...);
CREATE TABLE system14_webhook_receipts (...);
```
