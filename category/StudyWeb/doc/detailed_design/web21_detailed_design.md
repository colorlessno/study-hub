# web21 詳細設計
## DevToolsで通信確認

## 1. 実装対象

React画面の4つのボタンからNestJS APIを呼び、HTTP 200・400・404・500の応答を意図的に再現する。HTTP応答と通信自体の失敗を分けて観察する教材とする。

```text
src/infra/compose/web21_network_debug/
└── docker-compose.yml
src/backend/src/studyweb/systems/web21_network_debug/backend/
├── Dockerfile
├── package.json
└── src/
    ├── app.module.ts
    ├── debug.controller.ts
    └── main.ts
src/frontend/src/studyweb/systems/web21_network_debug/frontend/
├── Dockerfile
├── package.json
└── src/
    ├── App.tsx
    ├── main.tsx
    └── styles.css
```

## 2. モジュール設計

| モジュール | 役割 | 主な処理 |
|---|---|---|
| `App.tsx` | 通信確認画面 | 4つのGET要求、HTTP状態番号とJSON本文の表示 |
| `DebugController` | 再現用API | 正常応答と3種類のNestJS例外を返す |
| `main.ts` | API起動 | NestJS起動とCORS設定 |
| `docker-compose.yml` | 実行環境 | backendとfrontendを起動する |

## 3. API設計

| メソッド | パス | 実装 | HTTP状態 |
|---|---|---|---|
| GET | `/debug/success` | 通常のJSONをreturn | 200 |
| GET | `/debug/bad-request` | `BadRequestException` | 400 |
| GET | `/debug/not-found` | `NotFoundException` | 404 |
| GET | `/debug/server-error` | `InternalServerErrorException` | 500 |

200応答は`statusCode`、`message`、`details.source`を返す。400・404・500はNestJS標準の例外フィルターが`statusCode`、`message`、`error`を含むJSONへ変換する。

## 4. フロントエンド処理

1. 押されたボタンに対応するパスを選ぶ。
2. `VITE_API_URL`または既定の`http://localhost:13021`へGET要求を送る。
3. HTTP状態にかかわらずJSON本文を解析する。
4. `HTTP状態番号`と`応答本文`を整形して画面に表示する。
5. 応答を受け取れない場合だけcatchし、通信エラーとして表示する。

`fetch`はHTTP 400・404・500だけでは例外にならないため、通信成功とHTTP業務エラーを別に扱う。

## 5. Docker Compose設計

| service | 公開ポート | 役割 |
|---|---|---|
| `backend` | 13021 → 3000 | 再現用NestJS API |
| `frontend` | 5181 → 5173 | Vite開発サーバー |

DB、DDL、AI処理、認証、監査ログ基盤は使用しない。

## 6. エラー設計

| 状況 | HTTP応答 | 画面処理 |
|---|---|---|
| 正常API | 200とJSON | 状態番号と本文を表示 |
| 入力不正例 | 400とNestJS標準JSON | 状態番号と本文を表示 |
| 未検出例 | 404とNestJS標準JSON | 状態番号と本文を表示 |
| サーバー障害例 | 500とNestJS標準JSON | 状態番号と本文を表示 |
| API停止・URL不正 | 応答なし | catchで通信エラーを表示 |

独自の共通エラー形式は追加せず、NestJS標準応答を観察対象とする。

## 7. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | 200ボタンを押す | HTTP 200と成功本文が表示される |
| `CHK-002` | 400・404・500を順に押す | 各状態番号と標準エラー本文が表示される |
| `CHK-003` | Networkタブを確認する | Request URL、Status、Responseを比較できる |
| `CHK-004` | backendを停止して操作する | HTTP応答ではなく通信エラーになる |
| `CHK-005` | backendを再起動する | 4種類のAPI確認へ戻れる |

学習手順と切り分け観点は[`doc/learning_notes/web21_network_debug/README.md`](../learning_notes/web21_network_debug/README.md)を参照する。
