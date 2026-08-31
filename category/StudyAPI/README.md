# Python標準ライブラリによるWeb API

Python標準ライブラリの `http.server` だけで作った小さなWeb APIです。HTTP要求、JSON入力の検証、状態コード、ローカルLLMへの中継、安全な初期設定を実際に確認します。

## このテーマでできるようになること

- 正常時と異常時に返す状態コードの違いを説明できる
- 利用者が送った入力の誤りと、LM Studioへの接続失敗を分けて確認できる
- URLに質問を含めず、POSTでJSONを送る理由を説明できる
- ローカル接続の制限、CORS、入力サイズ上限、固定エラー応答の役割を説明できる

## 最初に取り組むこと

最初はLM Studioを使わず、テスト用の一時HTTPサーバーと疑似応答で正常系・異常系を確認します。

```cmd
cd /d C:\work\work20260617\category\StudyAPI
rtk python -X utf8 -m unittest discover -s tests -p "test_*.py"
```

テストを実行する前に1件を選び、返る状態コードとJSONを予想します。実行後は、ソースのどの条件分岐が応答を決めているか確認します。

## 学習する通信経路

```text
HTTPを送る側
  └─ StudyAPI (127.0.0.1:9898)
       ├─ HTTP要求を一件ずつ順番に処理
       ├─ /health, /fixed  LM Studio不要
       └─ POST /ask
            └─ LM Studio OpenAI互換API (既定127.0.0.1:5858)
```

| 接続先 | LM Studio | 用途 |
|----------|----------|------|
| `GET /health` | 不要 | APIが動いているか確認 |
| `GET /fixed` | 不要 | 固定JSONと応答ヘッダーの確認 |
| `POST /ask` | 必要 | JSON bodyを検証してlocal LLMへ中継 |
| `GET /ask?prompt=...` | 必要 | 初期状態では無効。URLへ質問を残す危険を比較する場合だけ明示的に有効化 |

## 起動

StudyHubから起動すると、APIは `127.0.0.1:43451` を使用します。単独で起動する場合は、環境変数で接続先とモデル名を指定します。

```cmd
set LMSTUDIO_BASE_URL=http://127.0.0.1:5858
set LMSTUDIO_MODEL=読み込み済みのモデル名
python -X utf8 src\simple_web_api.py
```

LM Studioが停止していても `/health` と `/fixed` は確認できる。

## 正常系のcurl例

別のコマンドプロンプトから実行します。

```cmd
curl.exe -i http://127.0.0.1:9898/health
curl.exe -i http://127.0.0.1:9898/fixed
curl.exe -i -X POST http://127.0.0.1:9898/ask -H "Content-Type: application/json" --data-raw '{"prompt":"HTTPを3行で説明してください"}'
```

期待結果:

- `/health`: `200` と `{"status":"ok"}`
- `/fixed`: `200` と固定message
- `POST /ask`: `200` と `answer`。生成時間はlocal modelに依存する

## 失敗系のcurl例

```cmd
# promptなし
curl.exe -i -X POST http://127.0.0.1:9898/ask -H "Content-Type: application/json" --data-raw '{}'

# JSON構文エラー
curl.exe -i -X POST http://127.0.0.1:9898/ask -H "Content-Type: application/json" --data-raw '{bad json}'

# Content-Type違反
curl.exe -i -X POST http://127.0.0.1:9898/ask -H "Content-Type: text/plain" --data-raw 'hello'

# query stringへpromptを置く旧形式は既定で無効
curl.exe -i "http://127.0.0.1:9898/ask?prompt=secret"

# 存在しないroute
curl.exe -i http://127.0.0.1:9898/unknown
```

| 条件 | status | error |
|------|--------|-------|
| promptなし | `400` | `prompt_required` |
| JSON構文エラー | `400` | `invalid_json` |
| JSON object以外 | `400` | `json_object_required` |
| request上限超過 | `413` | `request_too_large` |
| prompt上限超過 | `413` | `prompt_too_large` |
| Content-Type違反 | `415` | `content_type_must_be_application_json` |
| GET `/ask` | `405` | `get_ask_disabled` |
| upstream停止 | `502` | `upstream_unavailable` |

外部へ返すエラーは固定し、内部のURLや例外の詳細を応答へ含めません。

## 設定

| 環境変数 | 既定値 | 説明 |
|----------|--------|------|
| `WEB_API_HOST` | `127.0.0.1` | 待受先。ローカルアドレス以外は初期状態で拒否 |
| `WEB_API_PORT` | `9898` | 待受ポート |
| `WEB_API_MAX_REQUEST_BYTES` | `16384` | JSON body上限 |
| `WEB_API_MAX_PROMPT_CHARS` | `4000` | prompt文字数上限 |
| `WEB_API_CORS_ORIGIN` | 空 | 空ならCORSヘッダーを返さない。指定時も完全一致する接続元だけを許可 |
| `WEB_API_ALLOW_GET_ASK` | `false` | URL query版 `/ask` を明示的に有効化 |
| `WEB_API_ALLOW_REMOTE_BIND` | `false` | ローカルアドレス以外での待受を明示的に許可 |
| `LMSTUDIO_BASE_URL` | `http://127.0.0.1:5858` | ローカルLLMの接続先 |
| `LMSTUDIO_MODEL` | `local-model` | 読み込み済みのモデル名 |
| `LMSTUDIO_TIMEOUT_SECONDS` | `120` | LM Studio応答の待ち時間 |
| `WEB_API_MAX_UPSTREAM_RESPONSE_BYTES` | `1048576` | LM Studioから受け取る応答の上限 |
| `WEB_API_ALLOW_REMOTE_UPSTREAM` | `false` | ローカル以外のLLM接続先を明示的に許可 |

## セキュリティ上の制約

- 認証、認可、回数制限、TLS、永続的な監査ログを持たないため、外部公開しない。
- APIとLM Studioはローカル接続を初期値とする。外部接続を許可する設定は、隔離した演習環境以外で使わない。
- 質問をURL、サーバーログ、エラー応答へ含めない。通常は `POST /ask` を使う。
- CORS `*`を返さず、必要なoriginだけを明示する。
- 要求本文、質問、LM Studioの応答へサイズ上限を設ける。
- 複数のHTTP要求を同時処理せず、一件が完了してから次の要求を処理する。
- APIキー、個人情報、社内秘密を教材の入力へ入れない。
