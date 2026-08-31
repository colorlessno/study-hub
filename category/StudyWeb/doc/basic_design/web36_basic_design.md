# web36 localStorage注意点 基本設計
## 0. 関連要件

- `../requirements/web36_localstorage_notes_requirements.md`

## 1. 設計目的
localStorageとsessionStorageの保存・読取・削除を一つずつ体験し、保存期間の違いと保存情報のリスクを理解する画面を設計する。
## 2. 対象範囲

- localStorage操作
- sessionStorageとの比較
- DevTools Application確認
- 保存してよい情報・悪い情報の整理
## 3. 成果物構成

```text
src/frontend/static/studyweb/systems/web36_localstorage_notes/
  app/
  Dockerfile
doc/learning_notes/web36_localstorage_notes/
  README.md
  docs/
    storage_check.md
    storage_risk_table.md
```

## 4. 入力
| 入力 | 内容 |
|---|---|
| localStorage用メモ | `studyweb.web36.memo`へ保存する学習用の非機密データ |
| sessionStorage用メモ | `studyweb.web36.sessionMemo`へ保存する学習用の非機密データ |
| 操作 | 各保存領域に対する保存、読取、削除 |

## 5. 出力
| 出力| 内容|
|---|---|
| 画面表示 | 保存値と状態|
| DevTools確認 | Application タブの保存値 |
| リスク表 | 保存可否と理由 |

## 6. 処理手順
1. localStorageへ値を保存し、ページ再読み込み後も残ることを確認する
2. sessionStorageへ値を保存し、同じタブのページ再読み込み後は残ることを確認する
3. 新しいタブではsessionStorageの値を引き継がないことを確認する
4. DevToolsで二つの保存領域と固定キーを確認する
5. 各削除操作が対象の固定キーだけを削除することを確認する
6. tokenや個人情報の保存リスクを整理する
## 7. 確認観点

- localStorageの寿命を説明できる
- sessionStorageとの寿命の違いを説明できる
- 機密情報を保存していないか
- XSS時のリスクを説明できる
## 8. 後続工程への引き継ぎ

詳細設計では、画面項目、保存キー、リスク表、確認手順を定義する。
