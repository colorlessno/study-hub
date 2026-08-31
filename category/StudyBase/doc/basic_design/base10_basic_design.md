# base10 curlによるAPI確認 基本設計
## 0. 関連要件

- `../requirements/base10_curl_api_check_requirements.md`

## 1. 設計目的
`curl` で API を確認し、フロントエンドに依存せず HTTP メソッド、ヘッダー、body、status code、response を切り分ける学習サンプルを設計する。
## 2. 対象範囲

- curl コマンドの基本
- GET / POST の確認
- request header と JSON body
- status code と response body
- API 単体確認とフロントエンド切り分け

## 3. 成果物構成

```text
doc/learning_notes/base10_curl_api_check/
  README.md
  commands/
  notes/
src/samples/base10_curl_api_check/
  sample_api/
```
## 4. 入力
| 入力 | 内容 |
|---|---|
| API URL | 確認対象の endpoint |
| HTTP メソッド | GET、POST など |
| request header | Content-Type、Authorization など |
| request body | JSON 入力 |
| bind先 | ホスト実行時は`127.0.0.1`、コンテナ内実行時だけ`HOST=0.0.0.0` |

## 5. 出力
| 出力 | 内容 |
|---|---|
| curl コマンド集 | 成功・失敗の実行例 |
| API確認ログ | status、header、body の確認結果 |
| 切り分けメモ | API 問題かフロント問題かの判断 |

## 6. 処理方針
1. 小さいAPI をIPv4ループバックだけで起動する
2. curl で GET を確認する
3. JSON body 付き POST を確認する
4. header 指定を確認する
5. 400 / 401 / 403 / 404 / 405 / 413 / 415 / 500 / 502 の失敗例を確認する
6. 結果をログに残す

## 7. 確認観点

- status code と response body をセットで見ているか
- フロントエンドを使わず API 単体確認ができるか
- 失敗時のコマンドとレスポンスが残っているか
## 8. 後続工程への引き継ぎ

詳細設計では、サンプル API の endpoint、curl コマンド、期待レスポンス、失敗例を定義する。
