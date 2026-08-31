# ジョブの状態

## この教材で確認できる状態

| 状態 | 意味 | 応答に含まれる項目 |
|---|---|---|
| `queued` | 受け付けたが、まだ処理を始めていない | `id`, `status` |
| `running` | 処理中 | `id`, `status` |
| `succeeded` | 正常終了 | `id`, `status`, `result` |
| `failed` | 異常終了 | `id`, `status`, `error` |

```text
queued → running → succeeded
                 ↘ failed
```

この教材では成功するジョブと失敗するジョブを別々に受け付け、`succeeded`の処理結果と`failed`の失敗理由を比較します。実際のシステムでは中止を示す`canceled`なども必要になります。どの状態からどの状態へ移れるか、失敗理由を利用者向けと調査向けにどう分けるかも設計します。
