# web41 APIエラーレスポンス共通化 詳細設計

## 1. 実装対象

validation、business、systemの3種類のエラーを同じJSON構造で返し、フロントエンド側で表示先を判断できる最小のNode.js HTTP APIを実装する。

```text
src/backend/src/studyweb/systems/web41_api_error_response_common/
├── Dockerfile
├── package.json
└── api/src/server.js

doc/learning_notes/web41_api_error_response_common/
├── README.md
└── docs/
    ├── error_format.md
    └── error_mapping.md
```

外部ライブラリは使用せず、Node.js標準の`http`モジュールで3041番ポートを待ち受ける。
StudyHubから起動する場合は、テーマ間のポート重複を避けるため`PORT=43341`を渡す。

## 2. 共通エラーschema

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容を確認してください",
    "details": [],
    "requestId": "req_1767225600000"
  }
}
```

| フィールド | 型 | 用途 |
|---|---|---|
| `error.code` | string | プログラムがエラー種別を判断する安定した識別子 |
| `error.message` | string | 利用者へ表示できる日本語メッセージ |
| `error.details` | array | 項目別エラー等の追加情報。省略せず空配列を許可 |
| `error.requestId` | string | 問合せやログ照合に使うリクエスト識別子 |

`requestId()`は`req_${Date.now()}`形式で、エラーレスポンスの生成時に作成する。これは学習用の簡易実装であり、短時間に大量の要求を処理する環境での一意性は保証しない。

## 3. 関数設計

| 関数 | 入力 | 出力・副作用 |
|---|---|---|
| `requestId()` | なし | 時刻ベースの識別子を返す |
| `send(res, status, body)` | response、status、object | JSON Content-Typeとstatusを書き、bodyをJSON化して終了する |
| `error(code, message, details = [])` | code、message、details | 共通schemaのオブジェクトを返す |

`send`が設定するContent-Typeは`application/json`とする。内部例外、stack trace、ファイルパス等はレスポンスへ含めない。

## 4. エンドポイント

| パス | status | code | details |
|---|---:|---|---|
| `/validation` | 400 | `VALIDATION_ERROR` | nameの必須エラー1件 |
| `/business` | 409 | `ORDER_ALREADY_CLOSED` | 空配列 |
| `/system` | 500 | `INTERNAL_ERROR` | 空配列 |
| その他 | 200 | なし | `{ "ok": true }` |

### 4.1 Validation error

```json
{
  "field": "name",
  "message": "必須です"
}
```

フロントエンドは`details`を入力項目へ割り当てる。HTTP 400はリクエスト内容の修正で解決可能なエラーとして扱う。

### 4.2 Business error

HTTP 409と`ORDER_ALREADY_CLOSED`を返し、画面上部などフォーム全体のメッセージとして表示する。

### 4.3 System error

HTTP 500と`INTERNAL_ERROR`を返す。利用者向け文言は`時間をおいて再実行してください`とし、内部原因を公開しない。

## 5. ルーティング上の制約

現実装は`req.url`だけで分岐し、HTTPメソッドを検証しない。このため、学習時はGETで呼び出すが、同じパスへの別メソッドでも同じ応答になる。また、query string付きURLは完全一致しないため、その他パスの200応答になる。

本格APIへ拡張する場合は、メソッド制限、URL解析、404応答、Content-Typeのcharset、例外捕捉、構造化ログを追加対象とする。

## 6. フロントエンド表示マッピング

| 判定対象 | UI表示先 | 表示内容 |
|---|---|---|
| `VALIDATION_ERROR` | 各入力項目の近く | `details[].field`とmessage |
| 業務エラーcode | フォーム・画面上部 | `error.message` |
| `INTERNAL_ERROR`または500 | 共通通知領域 | 利用者向けの汎用message |

StudyHubの実行欄をフロント接続例とし、API応答の`error.code`と`details`から表示先を判定して「フロント表示例」に描画する。入力エラーでは項目名とメッセージ、業務エラーでは画面上部、内部エラーでは共通通知欄を示す。生のJSONも併記し、API契約と画面表示の対応を比較できるようにする。マッピング規則は`docs/error_mapping.md`にも記載する。

## 7. データ・セキュリティ設計

- データベース、ファイル永続化、AI処理は使用しない。
- 認証・認可と本格的な監査ログ基盤は対象外とする。
- system errorでは例外詳細やstack traceを返さない。
- `requestId`はレスポンスに含めるが、現実装ではサーバーログとの照合処理は実装しない。
- サンプルは固定レスポンスであり、リクエストbodyを解析しない。

## 8. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | `npm start`を実行する | `http://localhost:3041`で起動する |
| `CHK-002` | `GET /validation` | 400、共通schema、項目別detailsを返す |
| `CHK-003` | `GET /business` | 409、業務エラーcodeを返す |
| `CHK-004` | `GET /system` | 500、内部情報を含まない汎用文言を返す |
| `CHK-005` | その他のパスを呼ぶ | 200と`{ "ok": true }`を返す |
| `CHK-006` | 3エラーのrequestIdを確認する | すべて`req_`で始まる |
| `CHK-007` | `npm run build`を実行する | `node --check`が成功する |

## 9. 実装との対応

| 設計要素 | 実装箇所 |
|---|---|
| HTTPサーバーとルーティング | `api/src/server.js` |
| 起動・構文確認コマンド | `package.json` |
| 共通JSONの短い仕様 | `doc/learning_notes/web41_api_error_response_common/docs/error_format.md` |
| UIマッピング | `doc/learning_notes/web41_api_error_response_common/docs/error_mapping.md` |
| StudyHubのフロント表示例 | `app/src/frontend/catalog/apiErrorPresentation.ts`、`ThemePage.tsx` |

学習手順は[`doc/learning_notes/web41_api_error_response_common/README.md`](../learning_notes/web41_api_error_response_common/README.md)を参照する。
