# web44 注文ステータス遷移 基本設計
## 0. 関連要件

- `../requirements/web44_order_status_transition_requirements.md`

## 1. 設計目的
注文ステータスを状態遷移として定義し、不正遷移を防ぐ業務ルールサンプルを設計する。
## 2. 対象範囲

- status enum
- allowed transitions
- invalid transition error
- transition history

## 3. 成果物構成

```text
src/frontend/static/studyweb/systems/web44_order_status_transition/
  app/
  Dockerfile
doc/learning_notes/web44_order_status_transition/
  README.md
  docs/
    status_transition_table.md
    transition_check.md
```

## 4. 入力
| 入力| 内容|
|---|---|
| order id | 対象注文 |
| current status | 現在状態|
| next status | 変更先|

## 5. 出力
| 出力| 内容|
|---|---|
| updated order | 遷移成功 |
| business error | 不正遷移 |
| history | 遷移履歴 |

## 6. 処理手順
1. 状態一覧を定義する
2. 許可遷移表を定義する
3. 遷移要求を検証する
4. 許可時のみ状態を更新する
5. 不正時は業務エラーにする

## 7. 確認観点

- 状態を自由入力にしていないか
- 許可遷移と不正遷移を確認できる
- 履歴が残る
## 8. 後続工程への引き継ぎ

詳細設計では、状態一覧・遷移表、エラー形式、確認手順を定義する。
