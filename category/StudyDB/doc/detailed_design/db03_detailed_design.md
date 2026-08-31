# db03 詳細設計
## 正規化とERモデリング

## 0. 関連文書

- `../requirements/db03_normalization_er_modeling_requirements.md`
- `../basic_design/db03_basic_design.md`

## 1. 製造対象

```text
doc/learning_notes/db03_normalization_er_modeling/
  README.md
  docs/
    unnormalized_order_table.md
    normalization_steps.md
    er_model.md
    denormalization_notes.md
    db03_completion_check.md
```

## 2. 非正規表設計

| column | 内容 | 問題 |
|---|---|---|
| `order_id` | 注文ID | 注文単位の識別子 |
| `customer_name` | 顧客名 | 複数注文で重複 |
| `customer_email` | 顧客メール | 顧客情報更新時に不整合が起きる |
| `product_names` | カンマ区切りの商品名 | 繰り返し項目 |
| `product_prices` | カンマ区切りの価格 | 商品価格変更時に不整合 |
| `quantities` | カンマ区切りの数量 | 明細単位に分離できない |
| `order_total` | 合計金額 | 明細から再計算できる派生値 |

## 3. 正規化ステップ設計

| step | 内容 | 出力 |
|---|---|---|
| 0NF | 1行に複数商品を持つ非正規表 | 問題点リスト |
| 1NF | 繰り返し項目を行に展開 | 注文明細候補 |
| 2NF | 複合キーの一部だけに依存する項目を分離 | 商品、顧客候補 |
| 3NF | 推移従属を分離 | customers、products、orders、order_items |
| many-to-many | 注文と商品の多対多を中間テーブルで表現 | order_items |

## 4. ER表設計

| entity | 主な属性 | relation |
|---|---|---|
| customers | id、name、email | customers 1 -> N orders |
| products | id、name、price | products 1 -> N order_items |
| orders | id、customer_id、ordered_at、status | orders 1 -> N order_items |
| order_items | id、order_id、product_id、quantity、unit_price | orders と products の中間 |

## 5. 逆正規化メモ設計

| 観点 | 内容 |
|---|---|
| 許容条件 | 集計性能、読み取り頻度、履歴保持など明確な理由がある |
| リスク | 更新漏れ、二重管理、不整合 |
| 記録項目 | 目的、対象カラム、更新責務、検証方法 |

## 6. 確認手順

1. 非正規表の重複と更新不整合を洗い出す
2. 1NF、2NF、3NFの順に分割理由を記録する
3. ER表でentityとrelationを整理する
4. 多対多をorder_itemsで表現する
5. 逆正規化が必要になる条件とリスクを整理する
6. `db03_completion_check.md`を任意の作業フォルダーへ別名保存し、設計結果を記録する

## 7. 完了条件

- 非正規表の問題点を説明できる
- テーブル分割の理由を更新不整合と結びつけて説明できる
- 多対多を中間テーブルで表現できる

## 8. 安全性

- 題材は架空の注文データに限定する
- ER図はMarkdown表で表現できるようにし、特定ツール必須にしない
- テキストファイルは UTF-8 BOMなしで保存する
