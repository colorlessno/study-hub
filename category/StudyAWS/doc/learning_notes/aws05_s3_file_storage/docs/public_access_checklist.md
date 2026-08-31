# 公開設定チェック

- bucketとobjectを既定でprivateにする。
- 共有が必要な場合は、対象、操作、有効期限を限定したURLを使う。
- IAM、bucket policy、Block Public Accessの優先関係を確認する。
- object keyに利用者入力をそのまま使わない。
- metadataへ秘密情報を保存しない。
- versioning、削除、保持期間、lifecycleの責任を決める。
- 公開確認後に不要なobjectと共有手段を削除する。
