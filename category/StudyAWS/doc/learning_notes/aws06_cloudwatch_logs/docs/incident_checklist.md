# 障害調査チェックリスト

1. health checkと対象経路の状態コードを確認する。
2. 応答ヘッダーまたは本文からrequest IDを取得する。
3. 同じrequest IDの`request.started`から終了ログまでを順に追う。
4. `request.failed`のpath、statusCode、messageを確認する。
5. 直前の設定変更と同時刻の周辺ログを確認する。
6. token、Cookie、個人情報を調査記録へ転記しない。
