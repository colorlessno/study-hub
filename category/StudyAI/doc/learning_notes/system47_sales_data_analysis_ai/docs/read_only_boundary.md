# read-only境界

## 原則

AI説明に、売上データへの書き込み権限は不要。

## 許可すること

- `SELECT`
- `GROUP BY` を使う集計
- 並び替えと絞り込み
- 集計結果表の読み取り
- 結果に基づく説明文の作成

## 許可しないこと

- 説明処理中にtableを作成、変更、削除する
- 売上recordを更新する
- 集計結果に存在しない合計値を推測する
- DB credentials をAI promptへ送る

## 確認コマンド

```cmd
node checks\readonly_sql_check.js sql\monthly_sales.sql
```

このcheckerは簡易的なもの。明らかな書き込み・DDL keywordを検出するが、DB権限設計の代わりにはならない。
