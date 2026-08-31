# web42 pagination / sort / filter API 詳細設計

## 0. 関連文書

- `../requirements/web42_pagination_sort_filter_api_requirements.md`
- `../basic_design/web42_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studyweb/systems/web42_pagination_sort_filter_api/
  Dockerfile
  package.json
  api/src/server.js
doc/learning_notes/web42_pagination_sort_filter_api/
  README.md
  docs/query_parameters.md
  docs/response_format.md
```

## 2. Endpoint

| Method | Path | 内容 |
|---|---|---|
| GET | `/items` | filter・sort・pagination付き一覧 |
| 任意 | その他 | 404 `not_found` |

`/items`へGET以外でアクセスした場合は、`Allow: GET`を付けて405を返す。

## 3. データ

| 項目 | 型 | 内容 |
|---|---|---|
| `id` | number | 1〜30 |
| `name` | string | `Item 1`等 |
| `status` | string | `open` / `closed` |
| `createdAt` | string | `2026-04-DD` |

ローカル配列で完結し、DBは使用しない。

## 4. Query Parameter

| Query | 既定・現在の処理 |
|---|---|
| `keyword` | 未指定なら全件、name部分一致 |
| `status` | 未指定なら全件、`open / closed`を許可 |
| `sort` | 未指定なら生成順、`name / status / createdAt`を許可 |
| `order` | 既定asc、`asc / desc`を許可 |
| `limit` | 既定10、1〜50を許可 |
| `offset` | 既定0、0以上を許可 |

## 5. 処理手順

1. URLをpathnameとqueryへ分解する。
2. pathnameが`/items`以外なら404を返す。
3. limit・offsetを数値化し、許可範囲外なら400を返す。
4. status・sort・orderが許可値以外なら400を返す。
5. keyword・statusでfilterする。
6. sort指定時は対象propertyを文字列として比較する。
7. offsetからlimit件をsliceする。
8. `items`と件数・ページ位置・前後ページの有無を含む`meta`を返す。

## 6. Response

| Status | 条件 | Body |
|---:|---|---|
| 200 | 一覧取得 | `items`, `meta` |
| 400 | query parameter不正 | `invalid_*` |
| 404 | path不一致 | `not_found` |
| 405 | GET以外 | `method_not_allowed` |

`meta.total`はfilter後・pagination前の件数。`returned`は今回返した件数、`page / totalPages`は現在ページと総ページ数、`hasPrevious / hasNext`は前後ページの有無を表す。

## 7. 要件との差分・既知の課題

- in-memory 30件のため、DB query・index・大量データ性能は再現しない。
- 作成成果物のフロント接続例はStudyHubのテーマ画面が担当する。検索語、状態、並べ替え項目、並び順、取得件数、開始位置をquery parameterとして実APIへ送り、状態コードとJSONを表示する。

## 8. 確認手順

1. queryなしで先頭10件とtotal 30を確認する。
2. keyword・statusを単独・組合せで指定する。
3. sort・orderで並び順を比較する。
4. limit・offsetで取得範囲を変える。
5. 不正なstatus・sort・order・limit・offsetの400と、GET以外の405を確認する。
6. StudyHubの入力欄が空値を送らず、入力した条件だけをquery parameterへ変換することを確認する。

## 9. 完了条件

- filter / sort / paginationを組み合わせられる。
- total / limit / offset / returned / page / totalPages / hasPrevious / hasNextの意味を説明できる。
- 不正queryが400、GET以外が405になることを説明できる。
- filter → sort → paginationの順番を説明できる。
- StudyHubのフロント接続例から条件を実APIへ送信し、応答を確認できる。
