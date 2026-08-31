# web22 詳細設計
## TanStack QueryによるAPIデータ取得

## 1. 実装対象

React画面でTanStack Queryを使い、NestJS APIからタスク一覧を取得・再取得する。APIは要求回数をプロセスメモリー内で数え、再取得により表示が変わることを確認できるようにする。

```text
src/infra/compose/web22_tanstack_query/
└── docker-compose.yml
src/backend/src/studyweb/systems/web22_tanstack_query/backend/
├── Dockerfile
├── package.json
└── src/
    ├── app.module.ts
    ├── main.ts
    └── tasks.controller.ts
src/frontend/src/studyweb/systems/web22_tanstack_query/frontend/
├── Dockerfile
├── package.json
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── styles.css
    └── api/tasks.ts
```

## 2. モジュール設計

| モジュール | 役割 | 主な処理 |
|---|---|---|
| `main.tsx` | Query基盤 | `QueryClient`を作成し、Appを`QueryClientProvider`で囲む |
| `App.tsx` | 一覧画面 | `useQuery`、状態表示、手動`refetch` |
| `api/tasks.ts` | APIクライアント | `GET /tasks`、HTTP成功判定、JSON返却 |
| `tasks.controller.ts` | タスクAPI | 600ミリ秒待機し、要求回数入りの固定Task配列を返す |
| `docker-compose.yml` | 実行環境 | backendとfrontendを起動する |

## 3. Query設計

| 設定・戻り値 | 内容 |
|---|---|
| `queryKey` | `['tasks']` |
| `queryFn` | `fetchTasks` |
| `data` | `Task[]` |
| `isLoading` | 初回取得中 |
| `isFetching` | 初回を含む取得中。画面では再取得中判定にも使用 |
| `isError` / `error` | 取得失敗状態と例外 |
| `refetch` | 再取得ボタンから呼ぶ |

既定のQueryClient設定を使い、独自の`staleTime`や永続キャッシュは設定しない。

## 4. API設計

### GET `/tasks`

入力はない。600ミリ秒待機し、HTTP 200で固定2件のTask配列を返す。

| 項目 | 型 | 説明 |
|---|---|---|
| `id` | string | タスク識別子 |
| `title` | string | タスク名。2件目に要求回数を含む |
| `done` | boolean | 完了状態 |

`requestCount`はbackendプロセス内だけで保持し、APIを再起動すると0へ戻る。DBへ保存しない。

## 5. フロントエンド表示

| 条件 | 表示 |
|---|---|
| `isLoading` | 「読み込み中です。」 |
| `isFetching && !isLoading` | 「再取得中です。」 |
| `isError` | Errorのmessageを含む取得失敗表示 |
| `data`あり | Task一覧 |

`VITE_API_URL`が未設定の場合は`http://localhost:13022`を使う。`fetchTasks`はHTTP成功状態でない応答を例外にするが、Task配列の実行時形式検証は行わない。

## 6. Docker Compose設計

| service | 公開ポート | 役割 |
|---|---|---|
| `backend` | 13022 → 3000 | NestJS API |
| `frontend` | 5182 → 5173 | Vite開発サーバー |

DB、DDL、AI処理、認証、監査ログ基盤は使用しない。

## 7. エラー設計

| 状況 | 検出箇所 | 結果 |
|---|---|---|
| APIがHTTPエラーを返す | `response.ok` | ErrorをQueryへ返し、取得失敗表示 |
| API停止・URL不正 | `fetch`例外 | Queryのエラー状態と取得失敗表示 |
| Provider未設定 | React実行時 | 実装不備であり、学習用の正常操作には含めない |

独自の`query_failed`エラーコードは定義しない。

## 8. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | 初期表示する | 読込中表示の後に2件のTaskが表示される |
| `CHK-002` | 再取得を押す | 再取得中表示が出て、要求回数が増える |
| `CHK-003` | Networkタブを確認する | ボタン操作ごとにGET要求が発生する |
| `CHK-004` | backendを停止して再取得する | Queryのエラー表示になる |
| `CHK-005` | web19とソースを比較する | 非同期状態をTanStack Queryが管理している |

学習手順とキャッシュ確認方法は[`doc/learning_notes/web22_tanstack_query/README.md`](../learning_notes/web22_tanstack_query/README.md)を参照する。
