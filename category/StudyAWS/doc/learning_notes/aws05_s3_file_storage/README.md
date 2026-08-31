# aws05 objectの保存とkeyの境界

ローカルの一時フォルダーをbucket相当として使い、objectの保存、一覧、読み出し、metadata、公開範囲、削除、危険なkeyの拒否を確認します。実S3へは接続しません。

## このテーマでできるようになること

- objectをkeyで保存し、同じkeyから本文を読み出せる
- 複数のobject keyを一覧で確認できる
- content-typeとprivate/public相当をobject本文とは別のmetadataとして確認できる
- 保存したobjectを削除し、同じkeyが残っていないことを確認できる
- 親フォルダー参照と絶対パスを保存先の外へ出さない理由を説明できる

## 最初に取り組むこと

1. StudyHubで「保存して読み出す」を実行し、key、bytes、本文を確認する。
2. 「object一覧」を実行し、2つのkeyがフォルダー名を含む形で表示されることを確認する。
3. 「objectを削除」を実行し、保存したkeyが削除後に存在しないことを確認する。
4. 「metadataと公開範囲を比較」を実行し、privateとpublicの差、および期限付きURLを優先する理由を確認する。
5. 「危険なkeyを拒否」を実行し、3つの入力が拒否されることを確認する。
6. 保存処理とobject storageの補足を表示し、画面の結果と実装を照合する。

各操作には別々の一時フォルダーが使われ、処理終了後に削除されます。リポジトリ内の保存済みサンプルは変更しません。

## 画面で確認すること

- `docs/sample.txt`を保存した結果にkeyとbytesが含まれる
- 読み出した本文が保存元の`sample.txt`と一致し、metadataに`text/plain; charset=utf-8`と`private`が含まれる
- 一覧には`docs/sample.txt`と`archive/sample-copy.txt`が含まれる
- 削除結果の`existed`がtrue、`existsAfterDelete`と`metadataExistsAfterDelete`がfalseで、一覧が空になる
- 公開範囲の比較では、publicを既定にせず必要な相手へ期限付きURLを発行する方針が表示される
- `../secret.txt`、`docs/../../secret.txt`、絶対パスが`invalid_object_key`で拒否される

## コマンドで確認する場合

```cmd
cd /d C:\work\work20260617
rtk node category\StudyAWS\scripts\validate-studyaws.mjs aws05
```

## この教材で扱わないこと

実S3のAPI、IAM、署名URLの発行、暗号化、versioning、lifecycle、Block Public Accessは再現しません。metadataによる公開範囲の比較は概念確認です。実AWSでは公開範囲、保持期間、削除責任を別途確認します。
