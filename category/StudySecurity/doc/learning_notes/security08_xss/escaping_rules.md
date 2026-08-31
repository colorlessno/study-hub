# エスケープ規則

HTML本文、属性値、URL、JavaScript文字列では必要な処理が異なります。このサンプルではHTML本文にユーザー入力を文字として表示します。

| 出力context | 基本方針 | 注意点 |
|---|---|---|
| HTML本文 | `textContent`等で文字として設定する | HTMLを許可する要件がある場合は専用sanitizerを検討する |
| HTML属性 | DOM propertyと属性固有の検証を使う | event handler属性へ入力を入れない |
| URL | 許可するschemeとdestinationを検証する | `javascript:`等を拒否する |
| JavaScript文字列 | dataをscriptへ直接連結しない | JSONとして安全に受け渡す設計を使う |

「すべての特殊文字を同じ方法で置換する」のではなく、出力先に合う安全なAPIを選びます。CSPは被害を軽減する補助層であり、危険なsinkを安全なAPIへ置き換える主対策の代わりではありません。
