# web45 楽観ロック基本設計
## 0. 関連要件

- `../requirements/web45_optimistic_lock_requirements.md`

## 1. 設計目的
versionを使って同時更新の競合を検出し、上書き事故を防ぐサンプルを設計する。
## 2. 対象範囲

- version column
- update check
- 409 conflict
- 再読込導線
## 3. 成果物構成

```text
src/frontend/static/studyweb/systems/web45_optimistic_lock/
  app/index.html
  app/src/main.js
  app/server.js
  Dockerfile
doc/learning_notes/web45_optimistic_lock/
  README.md
  docs/
    conflict_flow.md
    optimistic_lock_check.md
```

## 4. 入力
| 入力| 内容|
|---|---|
| record id | 更新対象 |
| version | 読込時version |
| update data | 更新内容|

## 5. 出力
| 出力| 内容|
|---|---|
| updated record | 更新成功 |
| 409 error | 競合 |
| reload message | 再読込案内 |

## 6. 処理手順
1. 読込時にversionを返す
2. 画面からAPIへnameと読込時versionを送信する
3. APIでversion一致を確認する
4. 一致すれば更新しversionを進める
5. 不一致ならHTTP 409と現在値を返す
6. 画面で再読込を促す

## 7. 確認観点

- 古いversionで更新できない
- 409を適切に返すか
- 利用者が次に何をすべきかわかるか

## 8. 後続工程への引き継ぎ

詳細設計では、データ構造、競合の再現手順、エラー表示を定義する。
