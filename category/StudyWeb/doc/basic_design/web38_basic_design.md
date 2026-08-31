# web38 React Router CRUD 基本設計
## 0. 関連要件

- `../requirements/web38_react_router_crud_requirements.md`

## 1. 設計目的
一覧、詳細、新規作成、編集を URL で切り替える CRUD 画面を設計する。
## 2. 対象範囲

- React Router
- list / detail / create / edit
- route params
- not found

## 3. 成果物構成

```text
src/frontend/static/studyweb/systems/web38_react_router_crud/
  app/
  Dockerfile
doc/learning_notes/web38_react_router_crud/
  README.md
  docs/
    route_table.md
    navigation_check.md
```

## 4. 入力
| 入力| 内容|
|---|---|
| URL path | 表示画面を決める |
| route param | item id |
| form input | 作成・編集データ |

## 5. 出力
| 出力| 内容|
|---|---|
| 画面 | 一覧、詳細、作成、編集、not found |
| navigation log | 遷移確認|

## 6. 処理手順
1. route tableを定義する
2. ローカルデータでCRUD風画面を作る
3. 詳細・編集のURLのidを読む
4. 存在しない id は not found にする
5. 戻る・進む操作を確認する
## 7. 確認観点

- URLと画面が対応している
- 不正idを扱える
- CRUD導線が一貫している
## 8. 後続工程への引き継ぎ

詳細設計では、route一覧、画面項目、ローカルデータ構造を定義する。
