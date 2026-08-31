# web43 idempotency key 基本設計
## 0. 関連要件

- `../requirements/web43_idempotency_key_requirements.md`

## 1. 設計目的
同じ登録要求の再送で二重登録を防ぐ idempotency key 対応APIを設計する。
## 2. 対象範囲

- idempotency key header
- 初回登録
- 同一key再送信
- keyなし
- response再利用または409

## 3. 成果物構成

```text
src/backend/src/studyweb/systems/web43_idempotency_key/
  api/
  Dockerfile
  package.json
doc/learning_notes/web43_idempotency_key/
  README.md
  docs/
    idempotency_flow.md
    duplicate_check.md
```

## 4. 入力
| 入力| 内容|
|---|---|
| idempotency key | request header |
| request body | 登録データ |
| retry request | 同一keyの再送信|

## 5. 出力
| 出力| 内容|
|---|---|
| created response | 初回登録 |
| duplicate response | 同一key再送信|
| error response | keyなし応答|

## 6. 処理手順
1. POSTでkeyを受け取る
2. key未使用なら登録して結果を保存する
3. 同一keyなら保存済み結果を返す
4. keyなしの場合の応答を返す
5. フロントの二重送信防止と比較する
## 7. 確認観点

- 同一keyで二重登録されない
- key保持期間の考え方を説明できる
- ボタン無効化との違いを説明できる
## 8. 後続工程への引き継ぎ

詳細設計では、key保存形式、API仕様、再送確認手順を定義する。
