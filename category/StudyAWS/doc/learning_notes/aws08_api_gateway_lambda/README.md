# aws08 HTTP requestとLambda eventの変換

Node.jsのHTTPサーバーがrequestをLambda eventへ変換し、handlerの戻り値をHTTP responseへ戻す流れを確認するテーマです。

## このテーマでできるようになること

- GETとPOSTのrequestを実行し、200と201の応答を確認できる
- path parameterとquery stringがLambda eventへ変換される結果を確認できる
- name不足、壊れたJSON、存在しない経路を実行し、400と404の応答を確認できる
- HTTPのmethod、path、query、bodyがLambda eventへ変換される箇所を確認できる

## 最初に取り組むこと

1. StudyHubでテーマを起動する。
2. 「item一覧を取得」を実行し、statusCode 200と配列を確認する。
3. 「pathとqueryを取得」を実行し、`id=item-1`と`include=source`がeventへ入ることを確認する。
4. 「itemを登録」を実行し、statusCode 201と登録されたitemを確認する。
5. 「nameなしで登録」と「壊れたJSONを送信」を実行し、どちらも400でもエラー理由が異なることを確認する。
6. 「存在しない経路を取得」を実行し、404との違いを確認する。
7. 「HTTPとeventの変換処理」「Lambda handler」「SAM template」を開き、requestからresponseまでの処理を照合する。
8. 確認後にテーマを停止する。

StudyAWS全体の検証だけを行う場合は、リポジトリのルートで次を実行します。

```bat
rtk node category\StudyAWS\scripts\validate-studyaws.mjs aws08
```

## 確認できる範囲

このテーマではHTTPとLambda handlerの境界をローカルで確認します。API Gatewayの認証、stage、custom domain、quota、課金は再現しません。
