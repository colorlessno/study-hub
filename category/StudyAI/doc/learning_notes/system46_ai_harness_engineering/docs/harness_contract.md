# harness の入出力契約

## 入力

| 項目 | 内容 |
| --- | --- |
| task id | 実行対象を識別する |
| input files | 読み取り対象 |
| allowed actions | 許可された操作 |
| forbidden actions | 禁止操作 |
| expected output | 出力形式 |

## 出力

| 項目 | 内容 |
| --- | --- |
| findings | 問題や観察結果 |
| summary | 短い結果説明 |
| validation | 実行したcheck |
| residual risk | 残るrisk |

## 原則

AIの判断と、scriptによる決定的確認を分ける。
