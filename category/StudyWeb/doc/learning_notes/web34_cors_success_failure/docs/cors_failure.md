# CORS拒否時の確認手順

1. StudyHubでweb34を起動し、教材画面を開く。
2. ConsoleとNetwork（通信）を開く。
3. 「許可しないAPIへ送信」を押す。
4. 画面にブラウザが応答を利用できなかったことが表示されるか確認する。
5. Network（通信）でOPTIONSを選び、`Access-Control-Allow-Origin`がないことを確認する。

APIプロセスは動作している。CORS拒否はサーバー停止とは異なる。
