# 状態遷移表

| 現在の状態 | 許可する変更先 | 終端状態 |
|---|---|---|
| `draft` | `confirmed`, `canceled` | いいえ |
| `confirmed` | `shipped`, `canceled` | いいえ |
| `shipped` | `completed` | いいえ |
| `completed` | なし | はい |
| `canceled` | なし | はい |

## 代表的な不正遷移

| 現在の状態 | 変更先 | 理由 |
|---|---|---|
| `draft` | `shipped` | 確定前に出荷できない |
| `confirmed` | `draft` | 前の状態へ自由に戻せない |
| `shipped` | `canceled` | 出荷後取消を許可していない |
| `completed` | 任意 | 完了は終端状態 |
| `canceled` | 任意 | 取消は終端状態 |

実務で戻し・取消を許可する場合は、単純なstatus変更ではなく、権限・理由・補償処理・監査履歴を含めて設計する。
