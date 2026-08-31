# web34 CORS成功・失敗サンプル 基本設計
## 0. 関連要件

- `../requirements/web34_cors_success_failure_requirements.md`

## 1. 設計目的
異なるportのfrontend/backendでCORS失敗と成功を比較できるサンプルを設計する。
## 2. 対象範囲

- frontend と backend のポートの違い
- CORS拒否
- CORS許可
- preflight確認
- credentials確認
## 3. 成果物構成

```text
src/backend/src/studyweb/systems/web34_cors_success_failure/
  backend/
  frontend/
  Dockerfile
  package.json
doc/learning_notes/web34_cors_success_failure/
  README.md
  docs/
    cors_failure.md
    cors_success.md
```

## 4. 入力
| 入力| 内容|
|---|---|
| frontend origin | `http://127.0.0.1:3034` |
| backend origin | CORS拒否`http://localhost:3035`、CORS許可`http://localhost:3036` |
| CORS設定| 拒否設定、許可設定|
| credentials | 許可APIへCookieなし・ありで送信 |

## 5. 出力
| 出力| 内容|
|---|---|
| browser console | CORSエラー |
| network log | preflight と本リクエスト|
| success response | 許可後のAPIレスポンス|
| credential response | Cookie送信の有無と`Access-Control-Allow-Credentials` |

## 6. 処理手順
1. CORS未許可で通信失敗を確認する
2. Console と Network のエラーを記録する
3. 許可originを設定する
4. 通信成功を確認する
5. credentialsなし・ありの要求を順に実行し、Cookie送信の有無を比較する
6. curlとの差を比較する
## 7. 確認観点

- CORSがブラウザの制約であることを説明できる
- サーバー設定で解消することを確認できる
- 無制限許可の危険性を説明できる
## 8. 後続工程への引き継ぎ

詳細設計では、port、CORS設定値、失敗・成功の確認手順を定義する。
