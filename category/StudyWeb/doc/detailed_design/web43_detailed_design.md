# web43 idempotency key 詳細設計

## 0. 関連文書

- `../requirements/web43_idempotency_key_requirements.md`
- `../basic_design/web43_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studyweb/systems/web43_idempotency_key/
  Dockerfile
  package.json
  api/src/server.js
doc/learning_notes/web43_idempotency_key/
  README.md
  docs/idempotency_flow.md
  docs/duplicate_check.md
```

## 2. Endpoint

| Method | Path | 内容 |
|---|---|---|
| POST | `/orders` | idempotency key付き注文作成 |
| その他 | 任意 | 404 `not_found` |

## 3. 入力

| 入力 | 必須 | 内容 |
|---|---|---|
| `Idempotency-Key` header | はい | 同じ操作の再送を識別 |
| JSON body | いいえ | `name`。未指定時は`order` |

## 4. メモリデータ

| 変数 | 内容 |
|---|---|
| `results` | keyから初回成功resultを引くMap |
| `created` | 作成済みresultの配列と件数 |

サーバー再起動時に両方とも消える。

## 5. 処理手順

1. method・pathが対象外なら404を返す。
2. `Idempotency-Key`がなければ400を返す。
3. request bodyを読み、JSONとしてparseする。不正JSONは400を返す。
4. request bodyから比較用のpayload hashを作る。
5. Mapにkeyがあり、payload hashも一致すれば、保存済みresultを200で再返却する。
6. Mapにkeyがあり、payload hashが異なれば409を返す。
7. 新しいresultを生成してcreatedへ追加する。
8. key、payload hash、resultをMapへ保存する。
9. 201と`replay=false`を返す。

## 6. Response

| Status | 条件 | 主なBody |
|---:|---|---|
| 201 | 新しいkey | `replay=false`, `result`, `count` |
| 200 | 保存済みkey | `replay=true`, 初回`result`, `count` |
| 400 | keyなし | `idempotency_key_required` |
| 400 | 不正JSON | `invalid_json` |
| 409 | 同じkeyで異なるbody | `idempotency_key_payload_conflict` |
| 404 | route不一致 | `not_found` |

## 7. 要件との差分・既知の課題

- keyの保持期限・削除処理がない。
- key確認と結果保存を原子的に行わず、同時requestへの厳密性がない。
- processing / succeeded / failed等の処理状態を保存しない。
- 永続化しないため、再起動後の再送は新規登録になる。

## 8. 確認手順

1. keyなしで400を確認する。
2. 新しいkeyで201とcount 1を確認する。
3. 同じkeyで再送し、200・同じresult・count 1を確認する。
4. 新しいkeyでcountが増えることを確認する。
5. 同じkey・異なるbodyで409を確認する。
6. 不正JSONで400を確認する。
7. 再起動後にメモリ上のkeyが消えることを確認する。

## 9. 完了条件

- 同一keyで逐次再送したとき二重登録されない。
- 初回結果を再利用する理由を説明できる。
- button無効化とAPI側冪等性の違いを説明できる。
- payload一致、期限、同時requestの改善点を説明できる。
