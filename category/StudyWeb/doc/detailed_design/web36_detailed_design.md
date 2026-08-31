# web36 localStorage注意点 詳細設計
## 0. 関連文書

- `../requirements/web36_localstorage_notes_requirements.md`
- `../basic_design/web36_basic_design.md`

## 1. 製造対象

```text
src/frontend/static/studyweb/systems/web36_localstorage_notes/
  Dockerfile
  app/index.html
  app/src/main.js
doc/learning_notes/web36_localstorage_notes/
  README.md
  docs/storage_check.md
  docs/storage_risk_table.md
```

## 2. 保存領域設計

| 保存領域 | 固定キー | 保存期間の確認 |
|---|---|---|
| localStorage | `studyweb.web36.memo` | ページ再読み込みやブラウザ再起動後も同じ表示元で残る |
| sessionStorage | `studyweb.web36.sessionMemo` | 同じタブの再読み込みでは残り、別タブやタブ終了後には引き継がれない |

利用者が任意のキーを指定する機能は設けない。削除処理は各領域の固定キーに`removeItem`を実行し、同じ表示元にある別のキーを削除しない。

## 3. 画面項目

| 区分 | 項目 | 処理 |
|---|---|---|
| localStorage | 学習メモ、保存、読込、削除、結果 | `localStorage`の固定キーだけを操作する |
| sessionStorage | 学習メモ、保存、読込、削除、結果 | `sessionStorage`の固定キーだけを操作する |
| 注意事項 | 機密情報を入力しない説明 | token、password、個人情報を保存しないよう明示する |

保存値が空文字の場合も保存済みとして区別できるよう、読込処理は`null`かどうかで未保存を判定する。

## 4. 確認手順

1. localStorage用メモを保存し、読込結果を確認する。
2. ページを再読み込みし、localStorage用メモが残ることを確認する。
3. sessionStorage用メモを保存し、同じタブの再読み込み後に残ることを確認する。
4. 同じURLを新しいタブで開き、sessionStorage用メモが引き継がれないことを確認する。
5. DevToolsのApplication（保存領域）で二つの固定キーを確認する。
6. 各削除ボタンを押し、対象の固定キーだけが消えることを確認する。
7. 保存可否表を読み、機密情報をブラウザ保存領域へ保存しない理由を整理する。

## 5. 完了条件

- localStorageとsessionStorageの保存期間の違いを説明できる。
- 二つの固定キーを保存、読取、削除できる。
- tokenや個人情報を保存する危険性を説明できる。
- 動作確認には非機密の架空データだけを使用している。
