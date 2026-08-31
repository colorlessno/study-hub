# web46 CSVアップロード基本設計
## 0. 関連要件

- `../requirements/web46_csv_upload_requirements.md`

## 1. 設計目的
CSVアップロード、検証、プレビュー、エラー表示、取込結果を確認するサンプルを設計する。
## 2. 対象範囲

- multipart upload
- CSV parse
- required columns
- row validation
- preview
- import result

## 3. 成果物構成

```text
src/frontend/static/studyweb/systems/web46_csv_upload/
  app/index.html
  app/src/main.js
  app/server.js
  samples/
  Dockerfile
doc/learning_notes/web46_csv_upload/
  README.md
  docs/
    csv_format.md
    import_result.md
```

## 4. 入力
| 入力| 内容|
|---|---|
| CSV file | 学習用CSV |
| required columns | 必須 |
| size limit | サイズ制限|

## 5. 出力
| 出力| 内容|
|---|---|
| preview | 先頭行表示 |
| row errors | 行単位エラー |
| import summary | 成功・失敗件数 |

## 6. 処理手順
1. ファイル選択を受け付ける
2. multipart/form-dataで検証APIへ送信する
3. サーバーで拡張子、サイズ、UTF-8を確認する
4. CSVをparseする
5. 必須列と行データを検証する
6. preview、成功件数、失敗件数、エラーをJSONで返す
7. 画面へ結果を表示する
8. 送信中はファイル選択と送信操作を無効化し、応答後に次の操作を受け付ける

## 7. 確認観点

- 異常CSVのエラーがわかる
- プレビューで取込前に確認できる
- ファイルサイズ制限がある
## 8. 後続工程への引き継ぎ

詳細設計では、CSV列定義、validation、サンプルCSV、画面状態を定義する。
