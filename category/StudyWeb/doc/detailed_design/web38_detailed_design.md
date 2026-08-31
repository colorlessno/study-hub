# web38 React Router CRUD 詳細設計

## 0. 関連文書

- `../requirements/web38_react_router_crud_requirements.md`
- `../basic_design/web38_basic_design.md`

## 1. 製造対象

```text
src/frontend/static/studyweb/systems/web38_react_router_crud/
  Dockerfile
  app/index.html
  app/src/main.jsx
  app/src/items.js
  app/bundle/main.js
  build.mjs
  package.json
  test/bundle.test.js
  test/items.test.js
doc/learning_notes/web38_react_router_crud/
  README.md
  docs/route_table.md
  docs/navigation_check.md
```

## 2. 実装方式

React、React DOM、React Routerを使用する。`HashRouter`配下に`Routes`と`Route`を定義し、URL、route parameter、表示componentを対応させる。項目はReactのstateで保持し、作成・更新・削除を画面から実行する。`build.mjs`は依存部品のroute先読みを1件ずつ処理する配布bundleを生成し、`test/bundle.test.js`が生成結果の順次処理を検査する。

## 3. Route

| Hash | 画面 | 内容 |
|---|---|---|
| `#/items` | 一覧 | 項目一覧、詳細・編集・削除リンク |
| `#/items/new` | 新規作成 | 名前の入力と保存 |
| `#/items/:id` | 詳細 | IDと名前 |
| `#/items/:id/edit` | 編集 | 現在の名前の入力と保存 |
| `#/items/:id/delete` | 削除確認 | 対象を確認して削除 |
| その他 | not found | not found見出し |

## 4. ローカルデータ

```text
Item
  id: number
  name: string
```

初期データは ID 1の`Alpha`とID 2の`Beta`。作成時は現在の最大IDに1を加え、更新と削除はIDで対象を特定する。要件の対象外であるDB連携は行わないため、再読み込み時は初期状態へ戻る。

## 5. 処理手順

1. `HashRouter`がhash部分を現在位置として管理する。
2. `Routes`が現在位置に一致する`Route`のcomponentを描画する。
3. `useParams`でURLのIDを取得し、state内のItemを検索する。
4. route不一致またはItem不存在なら`NotFound`を表示する。
5. 新規作成・編集formの保存後は`useNavigate`で一覧へ戻る。
6. 削除確認で削除した後も一覧へ戻る。
7. Link、戻る、進むによる履歴移動にReact Routerの表示が追従する。

## 6. 要件との対応

- React Routerで一覧、詳細、新規作成、編集、not foundを実装する。
- 学習上のCRUD導線を一画面で確認できるよう削除確認も実装する。
- URLと画面状態、route parameter、戻る・進むを対応させる。
- DB連携は対象外のため、項目はReactのstateに保持する。

## 7. 確認手順

1. 一覧からID 1・2の詳細へ遷移する。
2. 新規作成と編集へ遷移する。
3. 存在しないIDと不正なhashでnot foundを確認する。
4. ブラウザの戻る・進むで画面がURLに追従することを確認する。
5. 新規作成、編集、削除を行い、一覧へ反映されることを確認する。

## 8. 完了条件

- URLと表示画面が対応する。
- route parameterから対象Itemを検索できる。
- 不正routeと存在しないIDをnot foundとして扱える。
- React RouterのRoute、Link、route parameter、navigationの役割を説明できる。
