# web13 詳細設計
## NestJS Hello API

## 1. 実装対象

NestJSのModule、Controller、Serviceの責務分担を確認するため、固定メッセージと生成時刻を返すGET APIを実装する。

```text
src/backend/src/studyweb/systems/web13_nest_hello_api/
├── package.json
├── tsconfig.json
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── app.controller.ts
    └── app.service.ts
```

| モジュール | 役割 |
|---|---|
| `main.ts` | Nestアプリを生成し、ループバックアドレスと指定ポートで待ち受ける |
| `AppModule` | ControllerとProviderをNestのDIコンテナへ登録する |
| `AppController` | `GET /hello`を受け付け、Serviceへ処理を委譲する |
| `AppService` | レスポンスオブジェクトを生成する |

## 2. 起動処理

```text
npm run start:dev
  ↓
bootstrap()
  ↓
NestFactory.create(AppModule)
  ↓
PORTを数値化（未指定時3000）
  ↓
app.listen(port, "127.0.0.1")
```

`bootstrap()`が返すPromiseは`void bootstrap()`として開始する。ポートは`process.env.PORT`を数値化し、未指定時は3000番とする。待受先は`127.0.0.1`に限定する。CORS、認証、共通prefixは設定しない。StudyHubは43313番を指定して起動する。

## 3. ModuleとDI

`AppModule`は`controllers`へ`AppController`、`providers`へ`AppService`を登録する。Controllerのconstructor injectionにより、Nestが`AppService`のインスタンスを渡す。

```text
HTTP request
  ↓
AppController.getHello()
  ↓ constructor injection
AppService.getHello()
  ↓
return object → JSON response
```

## 4. API仕様

### GET `/hello`

| 項目 | 内容 |
|---|---|
| HTTPメソッド | GET |
| パス | `/hello` |
| リクエストbody | なし |
| クエリ・パスパラメータ | なし |
| 成功ステータス | 200 |
| Content-Type | `application/json` |

### レスポンス

| フィールド | 型 | 値・生成方法 |
|---|---|---|
| `message` | string | `Hello from NestJS` |
| `sample` | string | `web13_nest_hello_api` |
| `timestamp` | string | `new Date().toISOString()` |

レスポンス例は次のとおり。timestampはリクエストごとに変わる。

```json
{
  "message": "Hello from NestJS",
  "sample": "web13_nest_hello_api",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

## 5. エラーと入力検証

入力値がないため、DTOとValidationPipeは使用しない。定義されていないパスはNestJS標準の404応答となる。

| 状況 | 想定ステータス | 処理主体 |
|---|---|---|
| `GET /hello` | 200 | `AppController`と`AppService` |
| `GET /unknown` | 404 | NestJS標準ルーティング |
| 不正なHTTPリクエスト | 400系 | HTTPサーバーまたはNestJS |
| 起動ポートが使用中 | 起動失敗 | Node.js/NestJS |

特定メソッドへの想定外メソッドは、ルートの一致状況に応じてNestJS標準の404として処理されるため、独自の405応答は定義しない。

## 6. データ・セキュリティ設計

- HTTP API以外の外部サービスへ接続しない。
- データベース、ファイル永続化、AI処理は使用しない。
- 認証・認可と監査ログは扱わない。
- リクエスト値をレスポンスへ反映しない。
- timestamp以外の値は固定値とする。

## 7. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | `npm run start:dev`を実行する | 127.0.0.1の3000番ポートで起動する |
| `CHK-001A` | `PORT=43313`を指定して起動する | 127.0.0.1の43313番ポートで起動する |
| `CHK-002` | `GET http://localhost:3000/hello` | 200と3フィールドのJSONを返す |
| `CHK-003` | timestampを確認する | ISO 8601形式である |
| `CHK-004` | `/hello`を2回呼ぶ | timestampが各呼出しで生成される |
| `CHK-005` | `GET /unknown`を呼ぶ | NestJS標準の404応答になる |
| `CHK-006` | `npm run build`を実行する | NestJSのビルドが成功する |

## 8. 実装との対応

| 設計要素 | 実装箇所 |
|---|---|
| 起動とポート | `src/main.ts` |
| Controller・Provider登録 | `src/app.module.ts` |
| GETルート | `src/app.controller.ts` |
| レスポンス生成 | `src/app.service.ts` |

学習手順、故障演習、完了条件は[`doc/learning_notes/web13_nest_hello_api/README.md`](../learning_notes/web13_nest_hello_api/README.md)を参照する。
