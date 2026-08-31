# web50 N+1問題の再現 基本設計
## 0. 関連要件

- `../requirements/web50_n_plus_one_reproduction_requirements.md`

## 1. 設計目的
親子データ取得でN+1問題を再現し、改善後のクエリ回数を比較するサンプルを設計する。
## 2. 対象範囲

- 親子データ
- 悪い例
- 改善例
- query log
- 比較メモ

## 3. 成果物構成

```text
src/backend/src/studyweb/systems/web50_n_plus_one_reproduction/
  app/
  Dockerfile
  package.json
doc/learning_notes/web50_n_plus_one_reproduction/
  README.md
  docs/
    query_log_comparison.md
    n_plus_one_note.md
```

## 4. 入力
| 入力| 内容|
|---|---|
| parent data | ユーザー一覧|
| child data | タスク一覧|
| fetch mode | N+1 / optimized |

## 5. 出力
| 出力| 内容|
|---|---|
| result list | 親子データ一覧 |
| query count | 実行クエリ回数 |
| comparison | 改善後比較|

## 6. 処理手順
1. 親子データを用意する
2. 悪い例でN+1を起こす
3. query logを記録する
4. eager loading等で改善する
5. クエリ回数を比較する
## 7. 確認観点

- N+1発生理由を説明できる
- 改善後のログを比較できる
- ORMでもSQLが実行されることを確認できる
## 8. 後続工程への引き継ぎ

詳細設計では、データモデル、取得方法、ログ記録方法を定義する。
