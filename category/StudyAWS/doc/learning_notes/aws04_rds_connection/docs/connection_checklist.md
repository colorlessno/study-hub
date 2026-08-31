# 接続確認

接続失敗は、次の順で一つずつ切り分けます。

1. `DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、`DB_PASSWORD`が設定されているか。
2. host名を名前解決でき、portまで通信できるか。
3. database名とuser名が接続先に存在するか。
4. password誤りなどの認証error codeが返っていないか。
5. 実RDSでは接続元Security Group、subnet、route、NACL、TLS設定が一致しているか。
6. DBを外部公開していないか。public accessと`0.0.0.0/0`の許可がないか。
7. 確認結果へpasswordや接続文字列の秘密部分を記録していないか。
