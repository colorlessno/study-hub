# web34 CORS成功・失敗サンプル 要件定義

## 1. 目的

CORSエラーを再現し、許可オリジン、プリフライト、credentials の基本を理解する。

## 2. 学習対象

- Origin
- Same-Origin Policy
- CORS
- preflight request
- `Access-Control-Allow-Origin`
- credentials

## 3. 作成する成果物

- frontend / backend 分離サンプル
- CORS失敗設定
- CORS成功設定
- DevTools確認手順

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | CORSエラーを意図的に再現できる |
| FR-02 | 許可オリジン設定により通信成功へ変更できる |
| FR-03 | preflight request を確認できる |
| FR-04 | credentials の有無による挙動を確認できる |
| FR-05 | ブラウザのエラーとサーバーログを区別できる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | localhost の異なるportで再現する |
| NFR-02 | CORSを無制限許可する危険性を説明する |
| NFR-03 | 設定変更前後を比較できる |

## 6. 対象外

- 本番セキュリティ設計
- OAuth / SSO
- HTTPS

## 7. 受入条件

- CORSエラーの発生理由を説明できる
- 成功設定と失敗設定の差を説明できる
- DevTools Network / Console で確認できる

## 8. 学習観点

- CORSはサーバ側の許可設定である
- curlで成功してもブラウザでは失敗する場合がある
- エラー文を読むことで原因候補を絞れる
