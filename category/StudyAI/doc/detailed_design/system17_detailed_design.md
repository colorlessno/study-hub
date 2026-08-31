# System 17 詳細設計
## トークン分割の観察

## 1. 実装配置

```text
backend/src/studyai/systems/ai_learning/
  catalog.py
  service.py
  router.py
  __init__.py
frontend/src/pages/SystemLearningPage.tsx
scripts/ai_learning_demo.py
scripts/system17_demo.py
backend/tests/systems/test_ai_learning_systems.py
```

- 既存の`system01`から`system16`の個別実装は変更しない。
- `system17`から`system36`は`src/backend/src/studyai/systems/ai_learning/`の共通API・サービスを使用し、`catalog.py`のsystem IDとcategoryで処理を切り替える。
- フロントエンドは共通の`SystemLearningPage.tsx`を使用し、`system17`の入力補助と結果表示だけを分岐する。
- `system17`は外部AI APIへ通信せず、学習用の決定的な簡易分割をサーバー側で実行する。
- 実際のモデル固有Tokenizerとは結果が異なることを画面の注意点メモへ明示する。

## 2. コンポーネント設計

| コンポーネント | 役割 | 主な入口 |
|---|---|---|
| `ai_learning/catalog.py` | 既定入力、画面表示情報、日本語・英語・記号と改行・日英混在のサンプル文を定義する | `SYSTEMS` |
| `ai_learning/service.py` | 入力検証、簡易分割、文字数・推定トークン数・上限超過・注意点の算出、直近20件の履歴保存を行う | `execute()`, `execute_async()`, `list_runs()` |
| `ai_learning/router.py` | `/api/system17`配下のメタデータ、実行、履歴APIを提供する | `metadata()`, `execute()`, `runs()` |
| `SystemLearningPage.tsx` | サンプル選択、JSON入力、実行、結果、注意点、実行履歴を表示する | `execute()`, `resetInput()` |
| `src/scripts/system17_demo.py` | CLIから`system17`の既定入力を実行する | `main()` |

## 3. API設計

### 3.1 GET `/api/system17/metadata`

| 項目 | 型 | 内容 |
|---|---|---|
| `system_id` | string | `system17` |
| `title` | string | `トークン分割の観察` |
| `category` | string | `tokenizer` |
| `default_input` | object | `text`と`context_limit`を持つ既定入力 |
| `observation_hint` | string | 画面上部に表示する観察内容 |
| `samples` | array | `id`、`label`、`input`を持つ4件のサンプル文 |

### 3.2 POST `/api/system17/execute`

request:

```json
{
  "input": {}
}
```

response:

| 項目 | 型 | 内容 |
|---|---|---|
| `run_id` | string | 入力から生成した`system17-`始まりの実行ID |
| `system_id` | string | `system17` |
| `title` | string | 画面表示名 |
| `category` | string | `tokenizer` |
| `input` | object | 実行に使用した入力 |
| `result` | object | 文字数、推定トークン数、分割結果、上限超過、注意点 |
| `observation` | string | カタログに定義した観察内容 |
| `created_at` | string | UTCのISO 8601日時 |

### 3.3 GET `/api/system17/runs`

| 項目 | 型 | 内容 |
|---|---|---|
| `runs` | array | 新しい順に保持した直近20件の実行結果 |

## 4. 入力検証とエラー

| error_code | HTTP | 発生条件 |
|---|---|---|
| `system17_input_invalid` | 400 | `text`が空、または`context_limit`が0以下 |
| FastAPI標準エラー | 422 | request bodyが`ExecuteRequest`の形式に適合しない |
| 内部エラー | 500 | 想定外の例外が発生した |

入力エラーはHTTPExceptionの`detail`へ次の形式で格納する。

```json
{"error_code":"system17_input_invalid","message":"入力内容を説明するメッセージ"}
```

## 5. データと保存

| 保存先 | 主な項目 | 保持方針 |
|---|---|---|
| `data/ai_learning/system17_runs.json` | `run_id`, `system_id`, `title`, `category`, `input`, `result`, `observation`, `created_at` | 新しい順で直近20件 |

- 実行後はUTF-8のJSONへ保存し、StudyAIバックエンド起動時に読み戻す。
- Dockerでは`src/backend/data`をホスト側からマウントするため、コンテナを再作成しても履歴を保持する。
- 入力文は画面からAPIへ送信され、ブラウザだけで処理を完結させない。
- 外部APIキーや秘密情報を入力項目に持たない。

## 6. 画面と処理の流れ

| 段階 | 画面・処理 |
|---|---|
| 初期表示 | `GET /api/system17/metadata`から既定入力、説明、4件のサンプル文を取得する |
| 入力 | サンプルを選ぶか、`text`と`context_limit`をJSONで編集する |
| 実行 | `POST /api/system17/execute`へ入力を送る |
| 分割 | `[A-Za-z0-9_]+`を連続した1単位とし、それ以外の空白でない文字を1文字ずつ分割する |
| 結果 | 文字数、推定トークン数、分割結果、上限超過、注意点メモを表示する |
| 履歴 | `GET /api/system17/runs`で直近20件を取得し、選択した結果と入力を再表示する |

## 7. Docker・ローカル検証

| 確認 | コマンド | 期待結果 |
|---|---|---|
| Backend test | `docker compose run --rm backend-test python -m pytest -p asyncio -q tests/systems/test_ai_learning_systems.py` | サンプル、分割、入力エラーを含む対象テストが成功する |
| Demo script | `rtk python src\scripts\system17_demo.py` | 既定入力の実行結果をJSONで表示する |
| API | `GET /api/system17/metadata`、`POST /api/system17/execute`、`GET /api/system17/runs` | メタデータ、実行結果、履歴が取得できる |
| Docker compose | `docker compose up -d --build backend frontend` | バックエンドとフロントエンドが起動する |

- コマンドは`C:\work\work20260617\category\StudyAI`で実行する。
- `system17`の処理はLM Studioを使用しない。Docker環境のLM Studio設定は他systemとの共有設定であり、このテーマの必須条件ではない。
- 新規テキストはUTF-8 BOMなしを原則とする。この詳細設計書は既存のUTF-8 BOMとCRLFを維持する。

## 8. 受入確認

- `/api/system17/metadata`が既定入力と4件のサンプル文を返す。
- 日本語、英語、記号と改行、日英混在の各入力を画面から選択して実行できる。
- `/api/system17/execute`が文字数、推定トークン数、分割結果、上限超過、注意点メモを返す。
- 空の`text`と0以下の`context_limit`を入力エラーとして拒否する。
- `/api/system17/runs`から直近の結果を取得し、画面へ再表示できる。
- StudyAIバックエンドを再起動しても保存済みの実行履歴を読み戻せる。
- 簡易分割であり、実際のモデル固有Tokenizerとは異なることを画面とREADMEで確認できる。

## 9. 製造対象ファイル

実装・確認対象は次のファイルである。

- `src/backend/src/studyai/systems/ai_learning/catalog.py`
- `src/backend/src/studyai/systems/ai_learning/service.py`
- `src/backend/src/studyai/systems/ai_learning/router.py`
- `src/frontend/src/pages/SystemLearningPage.tsx`
- `src/scripts/ai_learning_demo.py`
- `src/scripts/system17_demo.py`
- `src/backend/tests/systems/test_ai_learning_systems.py`

