# Lambda eventメモ

API Gateway proxy eventでは、query string、headers、bodyがeventに入ります。handlerは`statusCode`、`headers`、`body`を返します。

| 入力 | この教材で確認する値 |
|---|---|
| event | `queryStringParameters.name`、`body` |
| context | `awsRequestId`、`functionName`、`memoryLimitInMB`、残り時間 |
| environment | `GREETING_PREFIX` |

メモリ上限と残り時間は直接呼出し用の模擬値です。実際のタイムアウト、メモリ使用量、コールドスタートはLambdaまたはSAMの実行環境で確認します。
