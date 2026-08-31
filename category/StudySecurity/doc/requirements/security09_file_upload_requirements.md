# security09 ファイルアップロード制御 要件定義

## 1. 目的

ファイル名とsizeのmetadata検証を入口に、拡張子、MIME、内容検査、保存名、保存場所を多層で設計する必要性を学ぶ。

## 2. 学習対象

- extension allowlist
- size limit
- MIMEの信頼境界
- server-side content inspection
- generated storage name

## 3. 作成する成果物

- metadata検証画面
- 許可拡張子とsize上限
- 許可・拒否ケース
- upload policyメモ

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | `.csv`、`.txt`、`.pdf`だけを許可できる |
| FR-02 | 拡張子を小文字へ正規化して比較できる |
| FR-03 | sizeを0以上1MiB以下に制限できる |
| FR-04 | 許可・拒否理由を画面へ表示できる |
| FR-05 | ローカルURLで静的教材を確認できる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | 実ファイルを選択、送信、保存しない |
| NFR-02 | browser申告のMIMEと拡張子だけで安全と断定しない |
| NFR-03 | 実マルウェアや危険ファイルを扱わない |

## 6. 対象外

- multipart upload API
- server-side MIME / magic number検査
- malware scanと隔離領域
- object storageへの保存

## 7. 受入条件

- 許可拡張子、禁止拡張子、size超過、負数を比較できる
- metadata検証だけでは内容の安全性を保証できないと説明できる
- 元ファイル名を保存名へ使わない理由を説明できる

## 8. 学習観点

- uploadは受信、検査、保存、配信を別の境界として設計する
- client-side検証はUXであり、server-side検証の代替ではない
- allowlistとsize上限だけで完了としない
