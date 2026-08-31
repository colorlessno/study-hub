# web22_tanstack_query 要件定義

## 1. 目的
TanStack Query を使って API データ取得を行い、非同期データ、キャッシュ、再取得の基本を理解する。

## 2. 対象ユーザー

- `fetch` 直書きの次の段階を学びたい人
- サーバー状態管理を体験したい人
- APIデータ取得の現代的な実装を知りたい人

## 3. 作成する成果物

TanStack Query でタスク一覧を取得・再取得する React アプリを作成する。
想定ファイル構成:

```text
src/infra/compose/web22_tanstack_query/
  docker-compose.yml
src/backend/src/studyweb/systems/web22_tanstack_query/backend/
src/frontend/src/studyweb/systems/web22_tanstack_query/frontend/
doc/learning_notes/web22_tanstack_query/README.md
```

## 4. 機能要件

### 4.1 データ取得
- TanStack Query の `useQuery` でタスク一覧を取得すること
- loading / error / success の状態を表示すること
- 取得したタスク一覧を表示すること

### 4.2 再取得
- 再取得ボタンでデータを更新できること
- API側データ変更後に画面へ反映できること

### 4.3 キャッシュ確認
- README にキャッシュの挙動を確認する手順を書くこと
- DevTools または画面表示で再取得の違いを確認できること

## 5. 非機能要件

- React + TypeScript を使うこと
- TanStack Query を導入すること
- API は NestJS または簡易サーバーで用意すること
- API URL は設定値として管理すること

## 6. 学習ポイント
- `QueryClientProvider`
- `useQuery`
- loading / error / data
- refetch
- fetch 直書きとの違い
- サーバー状態とクライアント状態の違い

## 7. 完了条件

- TanStack Query 経由で一覧が表示される
- 読み込み中とエラー表示がある
- 再取得が動作する
- README に起動方法とキャッシュ確認手順がある

## 8. 対象外
- `useMutation` による登録・更新
- DB保存
- 認証
- 無限スクロール
- 楽観的更新
