# web41 APIエラーレスポンス共通化 基本設計
## 0. 関連要件

- `../requirements/web41_api_error_response_common_requirements.md`

## 1. 設計目的
APIエラーを共通形式にし、フロントエンドがエラー種別に応じて表示できるサンプルを設計する。
## 2. 対象範囲

- validation error
- business error
- system error
- request id
- frontend error mapping

## 3. 成果物構成

```text
src/backend/src/studyweb/systems/web41_api_error_response_common/
  api/
  Dockerfile
  package.json
doc/learning_notes/web41_api_error_response_common/
  README.md
  docs/
    error_format.md
    error_mapping.md
```

## 4. 入力
| 入力| 内容|
|---|---|
| API request | 正常・異常入力|
| error type | validation / business / system |

## 5. 出力
| 出力| 内容|
|---|---|
| error response | code, message, details, requestId |
| UI error | field / form / system message |

## 6. 処理手順
1. 共通error bodyを定義する
2. validation errorを項目別に返す
3. business errorを返す
4. system errorで内部情報を隠す
5. フロントで表示を分ける

## 7. 確認観点

- エラー形式が一貫している
- 内部情報を返していないか
- フロントが項目別エラーを扱える
## 8. 後続工程への引き継ぎ

詳細設計では、error schema、endpoint、UI表示ルールを定義する。
