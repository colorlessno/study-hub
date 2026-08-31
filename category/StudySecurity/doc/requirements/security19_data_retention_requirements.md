# security19 データ保持・削除 要件定義

## 1. 目的

data種別ごとの保持期間とlegal holdから削除候補を判定し、安全なdry runと説明可能な削除workflowを学ぶ。

## 2. 学習対象

- retention period
- legal hold
- deletion candidateとdry run
- 削除判断のaudit

## 3. 作成する成果物

- data種別ごとの保持policy
- 削除候補を判定するCLI demo
- 境界日、unknown type、legal holdのcase
- deletion workflowの補足資料

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | order、inquiry、auditへ異なる保持日数を適用できる |
| FR-02 | 保持日数以上のrecordを削除候補にできる |
| FR-03 | legal hold付きrecordを削除候補から除外できる |
| FR-04 | unknown type・不正日付・未来日付を削除せず理由を返せる |
| FR-05 | ageDays、retentionDays、判断理由をdry run結果へ含められる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | 実file・実databaseを削除しない |
| NFR-02 | 判定日は固定可能にして再現性を持たせる |
| NFR-03 | policy変更と削除実行にはreview・auditが必要と明記する |

## 6. 対象外

- 法的な保持期間の決定
- backup・replicaからの実削除
- production scheduler

## 7. 受入条件

- 期限超過、期間内、legal hold、境界日、unknown typeを再現できる
- dry runと実削除を分離する理由を説明できる
- 削除対象の確認・承認・実行・証跡の流れを説明できる

## 8. 学習観点

- 保持しすぎと早すぎる削除の両方にriskがある
- legal holdは通常のretentionを一時停止する
- primary dataだけでなくbackup、cache、index、derived dataも考慮する
