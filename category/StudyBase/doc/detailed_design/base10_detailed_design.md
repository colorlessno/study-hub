# base10 curlによるAPI確認 詳細設計
## 0. 関連文書

- `../requirements/base10_curl_api_check_requirements.md`
- `../basic_design/base10_basic_design.md`

## 1. 製造対象

```text
doc/learning_notes/base10_curl_api_check/
  README.md
  commands/
  notes/
src/samples/base10_curl_api_check/
  sample_api/
```
## 2. API設計

ホストで直接起動するときは`HOST`未指定の既定値`127.0.0.1`へbindする。Dockerfileはコンテナ内でport公開を受けられるよう`HOST=0.0.0.0`を明示する。コンテナを起動する側は公開先を`127.0.0.1`へ制限する。

| Method | Path | 目的 | 主なレスポンス |
|---|---|---|---|
| GET | `/health` | 起動確認 | 200 |
| GET | `/items` | 一覧取得 | 200 |
| POST | `/items` | 登録 | 201 / 400 |
| GET | `/private` | 認証風ヘッダー確認 | 200 / 401 |
| GET | `/forbidden` | 権限不足例 | 403 |
| GET | `/error` | サーバーエラー例 | 500 |
| POST | `/health` | HTTPメソッド不一致 | 405 |
| POST | `/items` | 本文サイズ超過 | 413 |
| POST | `/items` | 対応していないContent-Type | 415 |
| GET | `/upstream-error` | 接続先サービスのエラー例 | 502 |

## 3. curl コマンド設計
| ファイル | 内容 |
|---|---|
| `curl_get_examples.md` | GET、header表示、status確認 |
| `curl_post_examples.md` | JSON body付きPOST、Content-Type |
| `curl_error_examples.md` | 400、401、403、404、405、415、500、502 の確認 |

## 4. 確認手順
1. API を起動し、表示URLが`http://127.0.0.1:<port>`であることを確認する
2. `/health` を curl で確認する
3. GET と POST を確認する
4. header 指定あり、なしを比較する
5. エラーレスポンスを確認する
6. フロントを使わず API 単体で問題を切り分ける
## 5. 完了条件

- サンプル API の endpoint が定義されている
- GET、POST、エラー確認用 curl が定義されている
- status code と response body をセットで確認できる
