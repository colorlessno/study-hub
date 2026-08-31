# arch02のcurlによるAPI証拠

arch02を起動した状態で、次のコマンドを一つずつ順番に実行する。

```cmd
curl.exe http://127.0.0.1:43702/api/review-scope
curl.exe -X POST http://127.0.0.1:43702/api/tasks -H "Content-Type: application/json" -H "X-Trace-Id: arch02-curl-001" -d "{\"title\":\"curlで証拠を取得\"}"
curl.exe http://127.0.0.1:43702/api/tasks
curl.exe http://127.0.0.1:43702/api/logs
curl.exe http://127.0.0.1:43702/health
curl.exe http://127.0.0.1:43702/ready
```

## 確認すること

1. review scopeの期待状態コードが201である。
2. タスク登録の実際の状態コードが202である。
3. タスク一覧に登録内容が保存されている。
4. `arch02-curl-001`と202が要求ログへ残っている。
5. healthとreadyが200である。

出力に秘密情報や個人情報を入れない。コマンド結果を記録するときは、実行日時、入力、状態コード、Trace IDを対応付ける。
