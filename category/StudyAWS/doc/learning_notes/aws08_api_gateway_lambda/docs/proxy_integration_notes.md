# Proxy Integration

HTTP method、path、query、bodyがLambda eventに入り、Lambda responseの`statusCode`、`headers`、`body`がHTTP responseになります。

| HTTP | Lambda event |
|---|---|
| method | `requestContext.http.method` |
| path | `rawPath` |
| `/items/{id}`の`id` | `pathParameters.id` |
| `?include=source` | `queryStringParameters.include` |
| request body | `body` |

ローカル代替サーバーはこの変換だけを再現します。API Gatewayの認証、stage、custom domain、quotaはSAMまたは実AWSで別途確認します。
