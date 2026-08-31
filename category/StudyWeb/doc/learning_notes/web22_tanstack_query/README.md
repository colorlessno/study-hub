# web22 TanStack QueryによるAPI取得

TanStack Queryの`useQuery`を使い、APIデータ、loading、error、再取得を宣言的に扱うテーマです。

## このテーマでできるようになること

- 初回読込中・取得成功・再取得中・取得失敗の各表示を確認できる
- queryKeyが保存データの識別子、queryFnがデータ取得処理であることを確認できる
- 「再取得」を押すとAPIがもう一度呼び出されることを確認できる
- web19と比較し、読込状態やエラー状態をTanStack Queryが管理することを確認できる

## 最初に取り組むこと

次の順番で確認する。

1. Composeを起動し、初回のloading表示から一覧へ変わる流れを確認する。
2. 再取得buttonを押し、一覧を残したまま取得中になる表示とdataの変化を確認する。
3. `main.tsx → App.tsx → api/tasks.ts`を辿り、取得処理と表示componentの役割を確認する。
4. queryKeyを確認し、同じ取得結果をcacheとして識別して複数componentから共有する仕組みを確認する。

## 起動方法

`category/StudyWeb/src/infra/compose/web22_tanstack_query`で実行します。

```bash
docker compose up --build
```

| 対象 | URL |
|---|---|
| Frontend | `http://localhost:5182` |
| API | `http://localhost:13022/tasks` |

## 状態と表示

| 状態 | 条件 | 表示 |
|---|---|---|
| 初回取得 | `isLoading` | `読み込み中です。` |
| 再取得 | `isFetching && !isLoading` | `再取得中です。` |
| 失敗 | `isError` | Error message |
| 成功 | `data`あり | Task一覧 |

開発時はReact StrictModeにより初期処理が複数回観察される場合があります。backendの`requestCount`はプロセス内の値なので、backend再起動で0へ戻ります。

## 自分の言葉で説明する

- QueryClient、QueryClientProvider、useQueryの関係を説明してください。
- isLoadingとisFetchingを分ける理由は何ですか。
- web19の手書きstateとTanStack Query版の違いは何ですか。

## うまく動かないとき

- Providerエラーでは`main.tsx`のラップ構造を確認します。
- 再取得しても数字が変わらない場合は、Networkとbackendプロセスを確認します。
- API失敗時は13022番、CORS、`VITE_API_URL`を確認します。
