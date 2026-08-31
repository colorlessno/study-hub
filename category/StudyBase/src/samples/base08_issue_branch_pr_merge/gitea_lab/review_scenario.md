# reviewシナリオ

## review担当からの修正依頼

> merge後に開発担当のローカルmainをどう更新するかが書かれていません。`main`へ切り替え、remoteの状態をfast-forwardで取り込む手順を完了条件へ追加してください。同じ不足がREADMEにもないか横展開確認してください。

## 開発担当が記録する内容

- 原因: server側のmergeとローカルmainの更新を同じ操作だと考えていた。
- 対処: `git switch main`と`git pull --ff-only origin main`を完了条件へ追加した。
- 横展開: READMEとPR本文も確認した。
- 再確認: 検証scriptを再実行し、差分を読み直した。

回答を記録した後、修正commitを同じ作業branchへpushします。新しいPRを作り直す必要はありません。
