# web35 HTTPステータス設計 詳細設計
## 0. 関連文書

- `../requirements/web35_http_status_design_requirements.md`
- `../basic_design/web35_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studyweb/systems/web35_http_status_design/
  Dockerfile
  package.json
  api/src/server.js
  test/server.test.js
doc/learning_notes/web35_http_status_design/
  README.md
  docs/status_code_matrix.md
  docs/curl_examples.md
```

## 2. 主要設計
| Status | Endpoint | 用途 |
|---|---|---|
| 200 | `GET /items` | 一覧取得 |
| 201 | `POST /items` | メモリ一覧へ登録成功 |
| 400 | `POST /items` 不正body | JSON・入力検証エラー |
| 401 | `GET /private` | 未認証 |
| 403 | `GET /admin` | 権限不足 |
| 404 | `GET /items/:id` 未存在 | 未存在 |
| 409 | `POST /items` 同名 | 現在状態との競合 |
| 500 | `GET /error` | 内部例外を共通エラーへ変換 |

## 3. 登録API

`POST /items`はJSONの`name`を受け取り、前後の空白を除去する。

| 条件 | Status | error.code |
|---|---:|---|
| JSONとして読めない | 400 | `INVALID_JSON` |
| `name`が文字列でない、または空白だけ | 400 | `VALIDATION_ERROR` |
| 同じ名前が既に存在する | 409 | `CONFLICT` |
| 登録可能 | 201 | なし |

登録成功時は次の連番IDを割り当ててプロセス内配列へ追加する。再度`GET /items`を実行すると追加結果を読み取れる。サーバー再起動時には初期データへ戻り、永続DBは使用しない。

## 4. エラー応答

400、401、403、404、409、500は次の共通形式を返す。

```json
{
  "error": {
    "code": "STABLE_CODE",
    "message": "利用者向け説明"
  }
}
```

`GET /error`は確認用の内部例外を発生させ、最上位の例外処理で500へ変換する。例外メッセージやスタックトレースは応答本文へ含めない。

## 5. 確認手順

1. `GET /items`で初期一覧を確認する。
2. `POST /items`へ項目名を送り、201と登録項目を確認する。
3. `GET /items`を再実行し、登録項目が追加されたことを確認する。
4. 空入力と同名再登録で400と409を確認する。
5. 401、403、404の意味と本文を比較する。
6. 500の本文に内部例外情報がないことを確認する。

## 6. 完了条件

- 主要statusを使い分けられる
- error bodyが共通形式になっている
- curl確認例がある
- 201の登録結果を200の一覧取得で読み戻せる
- 400と409が実際の入力・データ状態に基づいている
- 500で内部情報を返していない
