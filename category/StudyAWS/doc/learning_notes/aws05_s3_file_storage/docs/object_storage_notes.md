# オブジェクトストレージ

S3ではbucket、object key、metadataを分けて考えます。DBにはファイル本体ではなく、保存先keyやmetadataを持たせる設計が一般的です。

| 用語 | ローカル教材での対応 | 実S3で追加確認すること |
|---|---|---|
| bucket | 一時フォルダー | bucket policy、Block Public Access、region |
| object / key | ファイル / 相対パス | key設計、暗号化、上書き |
| metadata | 別JSONファイル | content-type、user metadata、tag |
| private / public | metadata値の比較 | IAM、bucket policy、object ownership |
| 期限付きURL | 推奨方針の表示 | 有効期限、操作権限、失効方法 |
| versioning / lifecycle | 概念説明のみ | 世代管理、保持期間、削除マーカー |

教材は操作ごとに新しい一時フォルダーを使い、終了後に削除します。リポジトリ内のサンプルを保存先にしません。
