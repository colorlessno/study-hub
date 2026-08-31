# web45 楽観ロック 詳細設計

## 0. 関連文書

- `../requirements/web45_optimistic_lock_requirements.md`
- `../basic_design/web45_basic_design.md`

## 1. 製造対象

```text
src/frontend/static/studyweb/systems/web45_optimistic_lock/
  Dockerfile
  app/index.html
  app/src/main.js
  app/server.js
doc/learning_notes/web45_optimistic_lock/
  README.md
  docs/conflict_flow.md
  docs/optimistic_lock_check.md
```

## 2. データ

```text
Record
  id: number
  name: string
  version: number
```

APIサーバーの`record`が現在値、画面のsnapshot A・Bが利用者A・Bの読込内容。初期recordは`元のデータ`, version 1。

## 3. API

| Method | Path | 処理 |
|---|---|---|
| GET | `/api/record` | 現在のレコードを返す |
| PUT | `/api/record` | version一致時だけ更新し、不一致時はHTTP 409と現在値を返す |
| POST | `/api/reset` | 教材の状態を版1へ戻す |

## 4. 画面操作

| 操作 | 処理 |
|---|---|
| load A | 現在recordをAへclone |
| load B | 現在recordをBへclone |
| edit A / B | 読み込んだnameを利用者ごとに編集 |
| save A | Aのversionと編集したnameで更新を試す |
| save B | Bのversionと編集したnameで更新を試す |
| reload A / B | 最新版を読み直し、現在nameを再編集できる状態へ戻す |

## 5. 保存判定

1. snapshotがなければ未読込を返す。
2. snapshot.versionとrecord.versionを比較する。
3. nameが空なら画面で保存せず、入力を促す。
4. 不一致ならHTTP 409、競合message、現在値を返し、recordを変更しない。
5. 一致なら編集したnameを更新する。
6. record.versionを1増やす。
7. 保存成功messageを返す。

## 6. 競合再現

```text
A load v1
B load v1
A save v1 -> success, record v2
B save v1 -> conflict, record remains v2
B reload v2
B save v2 -> success, record v3
```

## 7. 要件との差分・既知の課題

- APIサーバーのメモリ上で保存し、DBへ永続化しない。
- version条件付きUPDATEの原子性を実DBで保証していない。
- 読み直した最新版と競合前の編集内容を自動比較・統合する機能はない。利用者が画面の現在値と入力欄を見て再編集する。
- API通信中は全操作と入力欄を無効化し、一つの要求が完了してから次の操作を受け付ける。
- 悲観ロックやtransactionの実装比較は対象外。

DB版では、`UPDATE ... WHERE id = ? AND version = ?` の更新件数が0なら競合として扱う。

## 8. 確認手順

1. 未読込のsaveを確認する。
2. A・Bで同じversionを読み、それぞれ異なるnameを入力する。
3. Aを保存してnameが反映され、versionが進むことを確認する。
4. Bの古いversionが競合し、recordとAのnameを変えないことを確認する。
5. Bを再読込し、最新nameを確認して再編集した後に保存できることを確認する。
6. 保存済みAを再度保存し、古いsnapshotになることを確認する。

## 9. 完了条件

- version一致時だけ更新できる。
- 競合時にrecordを上書きしない。
- 再読込後に保存できる理由を説明できる。
- HTTP 409と現在値が返ることを確認できる。
