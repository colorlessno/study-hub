# サーバー確認

- プロセスが起動しているか。
- PID 1が`node app/server.js`で、意図した作業フォルダーと`PORT`になっているか。
- portが公開されているか。
- `/health`が応答するか。
- 標準出力ログにエラーがないか。
- 実EC2ではOS、IAM role、disk容量、Security Groupも別に確認したか。
