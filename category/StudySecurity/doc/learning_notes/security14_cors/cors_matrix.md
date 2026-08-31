# CORSマトリクス

| Origin | preflight | credentials | 結果 |
|---|---:|---:|---|
| `http://localhost:3000` | 204 | true | 許可 |
| `http://localhost:5173` | 204 | true | 許可 |
| その他 | 403 | false | CORS許可headerなし |

全responseで`Vary: Origin, Access-Control-Request-Method, Access-Control-Request-Headers`を返し、Origin等による差をcacheへ伝えます。CORSはbrowserの読取制御であり、server-sideの認証・認可ではありません。
