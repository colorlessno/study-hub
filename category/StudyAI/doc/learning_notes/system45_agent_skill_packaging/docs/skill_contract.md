# skill の入出力契約

## 入力

| 項目 | 内容 |
| --- | --- |
| task summary | agentが実行する短い目的 |
| source files | 参照対象のfile path |
| constraints | 変更禁止範囲、出力形式、検証条件 |

## 出力

| 項目 | 内容 |
| --- | --- |
| result summary | 何を行ったか |
| changed files | 変更したfile一覧 |
| validation | 実行したcheckと結果 |
| residual risk | 残るriskや未確認事項 |

## 禁止事項

- secret、token、passwordをsampleに含めない。
- userの実データをreferenceへ入れない。
- skill本文に長大な資料を詰め込まない。
- scriptがworkspace外を変更しない。
