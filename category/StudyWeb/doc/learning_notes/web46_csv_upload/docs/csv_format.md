# CSVの入力形式

## 現在の期待形式

```csv
code,name,price
P001,Pen,120
P002,Notebook,300
```

| 列 | 必須 | 検証内容 |
|---|---|---|
| `code` | はい | 空文字でない |
| `name` | はい | 空文字でない |
| `price` | はい | 空でなく、数値として解釈できる |

headerの列順は任意で、追加列もobjectへ含める。

## 現在扱えない例

```csv
code,name,price
P001,"Pen, Blue",120
```

単純なカンマ分割では、引用符内のカンマを正しく扱えない。

実務ではdelimiter、quote、改行、BOM、文字コード、空行、列数、最大行数等も仕様化する。
