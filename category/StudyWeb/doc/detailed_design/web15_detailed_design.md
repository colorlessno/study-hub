# web15 詳細設計
## APIエラーパターン確認

## 1. 実装対象

NestJS標準の例外クラスを使い、HTTP 200、400、404、500を固定エンドポイントで再現する。外部APIやDBの状態に依存させず、正常応答とエラー応答の違いを繰り返し確認できる構成とする。

```text
src/backend/src/studyweb/systems/web15_api_error_patterns/
├── package.json
├── tsconfig.json
└── src/
    ├── main.ts
    ├── app.module.ts
    └── errors/
        ├── errors.module.ts
        ├── errors.controller.ts
        └── errors.service.ts
```

| モジュール | 役割 | 主な処理 |
|---|---|---|
| `main.ts` | NestJSアプリの生成と起動 | `PORT`の読取、127.0.0.1での待受 |
| `AppModule` | エラー学習機能の組込み | `ErrorsModule`をimport |
| `ErrorsModule` | ControllerとServiceの登録 | DI設定 |
| `ErrorsController` | ステータス別GET APIの提供 | 正常応答または標準例外を返す |
| `ErrorsService` | 正常応答の生成 | `buildOk()` |

## 2. 起動設計

`NestFactory.create(AppModule)`でアプリを生成する。ポートは`process.env.PORT`を数値化し、未指定時は3000番とする。待受先は`127.0.0.1`に限定する。StudyHubでは43315番を指定し、`GET /status/ok`を起動確認に使う。

## 3. API仕様

| メソッド | パス | ステータス | 実装 |
|---|---|---:|---|
| GET | `/status/ok` | 200 | `ErrorsService.buildOk()`のobjectを返す |
| GET | `/status/bad-request` | 400 | `BadRequestException`を送出する |
| GET | `/status/not-found` | 404 | `NotFoundException`を送出する |
| GET | `/status/server-error` | 500 | `InternalServerErrorException`を送出する |

リクエストbody、クエリ、パスパラメータは使用しない。

### 3.1 正常レスポンス

```json
{
  "statusCode": 200,
  "message": "OK response"
}
```

### 3.2 エラーレスポンス

NestJS標準の例外レスポンスを使用する。

| フィールド | 型 | 内容 |
|---|---|---|
| `statusCode` | number | 400、404、500のいずれか |
| `message` | string | `bad_request_sample`、`not_found_sample`、`server_error_sample` |
| `error` | string | NestJSが付けるエラー種別 |

独自の`error_code`フィールドは追加しない。上記の識別文字列は標準レスポンスの`message`に格納される。

## 4. 処理フロー

```text
GET /status/*
  ↓
ErrorsController
  ├─ ok → ErrorsService.buildOk() → 200 JSON
  └─ error route → NestJS標準例外を送出
                         ↓
                    NestJS例外処理
                         ↓
                    400 / 404 / 500 JSON
```

## 5. 入力・データ設計

入力値がないためDTOとValidationPipeは使用しない。返却データは固定値であり、DB、ファイル、セッションへ保存しない。AI処理、外部API通信、認証・認可も扱わない。

## 6. エラーと安全上の扱い

- 500は学習用に明示的に再現する固定エンドポイントである。
- 実際の例外情報、スタックトレース、秘密情報はレスポンスへ含めない。
- 本番環境では意図的な500エンドポイントを公開しない。
- APIが返すHTTPエラーと、プロセス停止等による接続エラーを区別する。

## 7. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | `GET /status/ok`を呼ぶ | 200と`OK response`を返す |
| `CHK-002` | `GET /status/bad-request`を呼ぶ | 400と`bad_request_sample`を返す |
| `CHK-003` | `GET /status/not-found`を呼ぶ | 404と`not_found_sample`を返す |
| `CHK-004` | `GET /status/server-error`を呼ぶ | 500と`server_error_sample`を返す |
| `CHK-005` | APIを停止して同じURLを呼ぶ | HTTPレスポンスではなく接続エラーになる |
| `CHK-006` | `npm run build`を実行する | NestJSのビルドが成功する |

## 8. 実装との対応

| 設計要素 | 実装箇所 |
|---|---|
| 起動、ポート、待受先 | `src/main.ts` |
| 機能モジュールの組込み | `src/app.module.ts`、`src/errors/errors.module.ts` |
| 200・400・404・500ルート | `src/errors/errors.controller.ts` |
| 正常レスポンス生成 | `src/errors/errors.service.ts` |

学習手順と確認方法は[`doc/learning_notes/web15_api_error_patterns/README.md`](../learning_notes/web15_api_error_patterns/README.md)を参照する。
