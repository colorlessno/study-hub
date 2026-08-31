# 削除ワークフロー

1. 対象データを抽出する。
2. 保持期間と法的保留を確認する。
3. ドライランで削除候補を出す。
4. 承認後に削除し、監査記録を残す。

5. primary、backup、cache、search index、derived dataの各削除結果を確認する。
6. partial failureを再実行できるよう、policy versionと実行IDを記録する。

unknown type、不正日付、未来日付は削除せず、policy ownerへ確認します。legal hold中のrecordは通常の期限超過より優先して保持します。
