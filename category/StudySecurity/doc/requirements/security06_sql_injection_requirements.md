# security06 SQL Injection対策 要件定義

## 1. 目的

入力値をSQL文字列へ連結する危険性と、SQL本文とパラメータを分離する対策を比較する。

## 2. 学習対象

- SQL Injection
- string concatenation
- parameterized query
- placeholder
- defense in depth

## 3. 作成する成果物

- 危険なquery builder
- parameterized query builder
- ローカルの攻撃入力例
- 対策メモ

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | 文字列連結で入力がSQL本文へ混入する例を生成できる |
| FR-02 | 商品名とstatusをplaceholderへ分離できる |
| FR-03 | SQL本文とparameter配列を別々に確認できる |
| FR-04 | 条件数に応じてplaceholder番号を組み立てられる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | 実DBや外部システムへ攻撃入力を送らない |
| NFR-02 | 危険例と対策例を必ず並べる |
| NFR-03 | パラメータ化と入力検証を別の防御として説明する |

## 6. 対象外

- 実DBでのSQL実行
- ORM固有API
- DB権限、監査、WAF
- SQL tuning

## 7. 受入条件

- 文字列連結SQLの構造変化を説明できる
- placeholderにより入力が値として扱われる理由を説明できる
- 入力検証だけではSQL Injection対策を代替できないと説明できる

## 8. 学習観点

- 入力値をSQL構文へ連結しない
- parameterized queryを標準経路にする
- エラーへSQL本文や内部情報を出さない
