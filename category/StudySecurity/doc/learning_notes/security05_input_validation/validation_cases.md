# 検証ケース

| 対象 | 入力 | 期待結果 |
|---|---|---|
| 商品名 | 未指定、空文字、文字列以外 | `required_string` |
| 商品名 | 40文字 | 許可 |
| 商品名 | 41文字 | `too_long` |
| 価格 | 0 / 1,000,000 | 許可 |
| 価格 | 負数 / 1,000,001 / 小数 / 文字列 | `invalid_range` |
| CSV | `ID, name, price`の3列 | 商品validatorへ進む |
| CSV | 3列以外 | `rowNumber`付き`column_count` |

現実装ではCSVの2列目を商品名、3列目を価格として商品validatorへ渡します。1列目の商品IDは検証していないため、列の意味をすべて扱うCSV importerではありません。
