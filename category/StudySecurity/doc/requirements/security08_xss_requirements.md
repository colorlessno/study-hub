# security08 XSS対策 要件定義

## 1. 目的

ユーザー入力をHTMLとして解釈する危険性と、表示先のcontextに合わせて安全に出力する考え方を学ぶ。

## 2. 学習対象

- XSS
- DOM sink
- `innerHTML` / `textContent`
- output encoding
- CSPの位置付け

## 3. 作成する成果物

- ローカル静的画面
- `textContent`による安全表示
- 危険なsinkの説明
- context別のエスケープメモ

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | 入力文字列を`textContent`で文字として表示できる |
| FR-02 | `innerHTML`ならmarkupとして解釈される差を説明できる |
| FR-03 | HTML本文、属性、URL、JavaScript文字列で対策が異なると説明できる |
| FR-04 | ローカルURLで静的教材を確認できる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | 実害のあるpayloadや外部送信を扱わない |
| NFR-02 | 危険なHTMLを実行する画面を提供しない |
| NFR-03 | CSPを主対策ではなく補助対策として説明する |

## 6. 対象外

- stored XSS用の永続DB
- HTML sanitizer library
- CSP headerの本格実装
- browser脆弱性

## 7. 受入条件

- tag形式の入力が文字として表示されることを確認できる
- `innerHTML`と`textContent`の違いを説明できる
- 出力contextごとに対策を選ぶ必要性を説明できる

## 8. 学習観点

- 入力した時点ではなく、出力するcontextで安全性を判断する
- frameworkの既定escapeを無効化する機能を慎重に扱う
- CSPだけでunsafe sinkを正当化しない
