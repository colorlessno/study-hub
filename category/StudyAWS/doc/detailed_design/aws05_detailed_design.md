# aws05 S3ファイル保存 詳細設計

## 0. 関連文書

- `../requirements/aws05_s3_file_storage_requirements.md`
- `../basic_design/aws05_basic_design.md`

## 1. 製造対象

```text
doc/learning_notes/aws05_s3_file_storage/
  README.md
  docs/
src/backend/src/studyaws/systems/aws05_s3_file_storage/
  package.json
  Dockerfile or docker-compose.yml where applicable
  app/ api/ web/ src/ scripts/ events/ data/ storage as required by the local sample
src/infra/aws05_s3_file_storage/
  template.yaml where applicable
```

## 2. 実装詳細

- ローカルディレクトリをbucket相当として使う。
- `storage.js`はupload、list、get、deleteの疑似操作を行う。
- object本文とは別の`.studyaws-metadata`領域へcontent-typeとprivate/public相当をJSONで保存する。
- `metadata-access`操作はprivateとpublicの差を表示し、実運用では公開せず期限付きURLを優先する方針を示す。
- object keyは正規化し、`..`を含むpath traversalを拒否する。
- 実S3接続は行わない。
## 3. 実行コマンド
```cmd
rtk node app\storage.js save-read
rtk node app\storage.js metadata-access
```

## 4. 確認手順
1. サンプルファイルを疑似bucketへ保存する。
2. object一覧を表示する。
3. object内容とmetadataを取得する。
4. private/publicのmetadata差分を確認する。
5. objectを削除し、本文とmetadataが残らないことを確認する。
6. path traversal風のkeyが拒否されることを確認する。
## 5. 実AWS発展課題
LocalStackでS3互換APIを試す。実S3を使う場合はbucket公開設定、削除、課金注意を明記する。
## 6. 完了条件

- bucket、object key、metadataの意味を説明できる。
- public/privateの注意点を説明できる。
- ローカル疑似ストレージで基本操作を確認できる。
