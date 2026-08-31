# aws05 S3ファイル保存 基本設計

## 0. 関連文書

- `../requirements/aws05_s3_file_storage_requirements.md`

## 1. 設計方針
S3のbucket/object/keyを、まずローカル疑似ストレージで学ぶ。LocalStackが利用できる場合はS3互換APIへ発展できる構成にする。
## 2. ローカル学習方式
- ファイルシステム上の`storage/bucket-name/object-key`をS3相当として扱う。
- upload、list、get、deleteをCLIまたはNodeスクリプトで確認する。
- public/privateの違いはメタデータで表現する。
## 3. 成果物構成

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

## 4. 設計内容

| 要素 | 内容 |
|---|---|
| bucket | ローカルディレクトリで表現する |
| object key | path traversalを防ぐ対象として扱う |
| metadata | content-type、private/public相当を記録する |
| presigned URL | 概念説明に留める |

## 5. 実AWS発展課題
- LocalStackでS3 API互換操作を試す。
- 実S3はbucket公開設定、削除、課金注意を明記してから扱う。
## 6. 完了条件

- DB保存とオブジェクト保存の違いを説明できる。
- object key設計と公開設定の注意点を説明できる。
- ローカルで保存、一覧、取得、削除の流れを説明できる。
