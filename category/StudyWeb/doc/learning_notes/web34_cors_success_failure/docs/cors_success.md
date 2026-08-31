# CORS許可時の確認手順

1. StudyHubでweb34を起動し、教材画面を開く。
2. 「許可するAPIへ送信」を押す。
3. 画面にHTTP 200とJSONの応答本文が表示されることを確認する。
4. Network（通信）でOPTIONSとPOSTを開く。
5. `Access-Control-Allow-Origin: http://127.0.0.1:3034`と、許可するヘッダー・要求方法を確認する。
