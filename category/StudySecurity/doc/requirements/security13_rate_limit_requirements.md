# security13 レート制限 要件定義

## 1. 目的

固定時間窓の小さなlocal実装で、制限key、429応答、reset境界を学ぶ。

## 2. 学習対象

- fixed window counter
- user ID相当値とIP相当値
- HTTP 429と`Retry-After`
- 制限対象外endpoint

## 3. 作成する成果物

- in-memory rate limiter
- local HTTP server
- 境界時刻を含むCLI demo
- 制限方針の補足資料

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | 10秒間に3回までrequestを許可できる |
| FR-02 | 4回目を429と`Retry-After`で拒否できる |
| FR-03 | 時間窓の終了時刻から新しいcounterへresetできる |
| FR-04 | `/health`を制限対象外にできる |
| FR-05 | 残り回数をresponse headerで確認できる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | 外部serviceへの負荷試験を行わない |
| NFR-02 | `X-Demo-User`はlocal教材用keyであり本人確認に使わない |
| NFR-03 | in-memory方式の複数instance間不整合を明記する |

## 6. 対象外

- distributed counter
- bot判定
- 本番trafficに対する負荷試験

## 7. 受入条件

- CLI demoで3回成功、4回目拒否、reset後成功を確認できる
- HTTP応答で429、残り回数、再試行秒数を確認できる
- key選択による回避と誤制限のtrade-offを説明できる

## 8. 学習観点

- rate limitは認証・認可を置き換えない
- proxy配下のclient IPは信頼境界を定義して取得する
- endpointのcostとriskに応じてkey・閾値・窓を分ける
