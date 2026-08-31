# web44 注文ステータス遷移 詳細設計

## 0. 関連文書

- `../requirements/web44_order_status_transition_requirements.md`
- `../basic_design/web44_basic_design.md`

## 1. 製造対象

```text
src/frontend/static/studyweb/systems/web44_order_status_transition/
  Dockerfile
  app/index.html
  app/src/main.js
doc/learning_notes/web44_order_status_transition/
  README.md
  docs/status_transition_table.md
  docs/transition_check.md
```

## 2. データ

```text
Order
  id: number
  status: string
  history: string[]
```

初期状態は`draft`。historyには初期状態を含める。

## 3. 許可遷移

| Current | Allowed next |
|---|---|
| `draft` | `confirmed`, `canceled` |
| `confirmed` | `shipped`, `canceled` |
| `shipped` | `completed` |
| `completed` | なし |
| `canceled` | なし |

`completed`と`canceled`は終端状態。

## 4. 画面

| 要素 | 役割 |
|---|---|
| next select | 変更先statusを選択 |
| transition button | 遷移判定を実行 |
| output | message、現在status、historyを表示 |

## 5. 処理手順

1. selectから変更先を取得する。
2. `allowed[current]`に変更先が含まれるか判定する。
3. 不許可なら業務エラーを表示し、データを変更しない。
4. 許可ならstatusを更新する。
5. historyへ新statusを追加する。
6. 成功messageと更新後状態を表示する。

## 6. 要件との差分・既知の課題

- 静的JavaScript内の1注文だけで、API・DBはない。
- 業務エラーは画面文字列で、HTTP error responseではない。
- historyはstatusだけで、変更前後・日時・操作者・理由を持たない。
- selectには不許可の変更先も常に表示する。
- 再読み込みで初期状態へ戻る。

## 7. 確認手順

1. `draft -> shipped`が拒否されることを確認する。
2. `draft -> confirmed -> shipped -> completed`を実行する。
3. 終端状態からの遷移が拒否されることを確認する。
4. 不正遷移時にstatus・historyが変化しないことを確認する。
5. 再読み込み後に`draft -> canceled`を確認する。

## 8. 完了条件

- 許可遷移だけが状態を変更する。
- 不正遷移を業務エラーとして扱える。
- 終端状態を遷移表から説明できる。
- 実務の監査履歴に必要な項目を説明できる。
