# web42 pagination / sort / filter API 基本設計
## 0. 関連要件

- `../requirements/web42_pagination_sort_filter_api_requirements.md`

## 1. 設計目的
業務一覧向けにfilter、sort、paginationを持つAPIを設計する。
## 2. 対象範囲

- query parameter
- keyword / status filter
- sort key / order
- limit / offset
- response metadata

## 3. 成果物構成

```text
src/backend/src/studyweb/systems/web42_pagination_sort_filter_api/
  api/
  Dockerfile
  package.json
doc/learning_notes/web42_pagination_sort_filter_api/
  README.md
  docs/
    query_parameters.md
    response_format.md
```

## 4. 入力
| 入力| 内容|
|---|---|
| keyword | 部分一致検索 |
| status | 状態絞り込み |
| sort | 並び替え |
| limit / offset | ページング |

## 5. 出力
| 出力| 内容|
|---|---|
| items | 表示対象データ |
| metadata | total, limit, offset, returned, page, totalPages, hasPrevious, hasNext |
| validation error | 不正query |
| StudyHub操作欄 | query入力、API送信、状態コード・JSON表示を行うフロント接続例 |

## 6. 処理手順
1. query parameterを受け取る
2. 入力値を検証する
3. filterとsortを適用する
4. limit / offsetで切り出す
5. metadata付きで返す
6. StudyHub操作欄から条件を送信し、結果とエラーを表示する

## 7. 確認観点

- 全件返却していないか
- 不正queryを検出できる
- metadataの意味を説明できる
## 8. 後続工程への引き継ぎ

詳細設計では、query仕様、response schema、確認コマンドを定義する。
