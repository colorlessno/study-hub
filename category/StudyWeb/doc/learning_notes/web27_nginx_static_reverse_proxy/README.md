# web27 Nginxの静的配信とAPI転送

NginxからHTML・CSSを配信し、同じoriginの`/api/`だけを別コンテナのNode.js APIへ転送するテーマです。

## このテーマでできるようになること

- Nginxが配信するWebページを表示できる
- 「APIの稼働状態を確認」を押し、同じ接続元からAPI応答を取得できる
- `/api/health`への要求が、API側の`/health`へ転送されることを確認できる
- API停止時に画面でHTTP 502または504を確認し、NginxとAPIのログを比較できる

## 最初に取り組むこと

次の順番で確認する。

1. Composeを起動し、`http://localhost:8087`から`/api/health`を呼んでNetworkを確認する。
2. browserのrequest URL、Nginx設定、APIの`/health`を対応付け、pathを書き換えて転送する流れを確認する。
3. API containerを停止して同じrequestを送り、Nginxが返すstatusを確認する。
4. 静的fileの配信とAPIへの転送を一つの入口で扱うリバースプロキシの役割を確認する。

## 起動方法

`category/StudyWeb/src/infra/compose/web27_nginx_static_reverse_proxy`で実行します。

```bash
docker compose up --build
```

| 対象 | URL |
|---|---|
| 静的ページ | `http://localhost:8087` |
| Proxy経由API | `http://localhost:8087/api/health` |

## リクエストの流れ

```text
Browser /api/health
  ↓ localhost:8087
Nginx location /api/
  ↓ proxy_pass http://api:3000/
API GET /health
```

`proxy_pass`のURL末尾に`/`があるため、locationに一致した`/api/`部分を置き換えて`/health`を転送します。
転送先へ接続できない場合は、`proxy_connect_timeout`により長時間待たずに502または504を返します。接続拒否では502、接続の制限時間超過では504になることがあります。

## 観察ポイント

- HTMLとCSSがNginxから200で配信されるか
- Browserが`api:3000`ではなく`localhost:8087/api/health`だけを呼ぶか
- APIレスポンスが`web27-api`を含むか
- 同一origin通信のためBrowser側CORS設定が不要か
- API停止時にNginxが返すHTTP 502または504と応答本文が画面へ表示されるか

## 自分の言葉で説明する

- 静的配信とAPI Proxyの流れを説明してください。
- Nginxを挟むとBrowser側のURLが単純になる理由は何ですか。
- 404と502・504をどのログで切り分けますか。

## うまく動かないとき

- 画面自体が開かない場合はnginx serviceと8087番を確認します。
- APIだけ失敗する場合は`docker compose logs nginx`と`logs api`を比較します。
- 設定変更後はnginxを再起動し、読み込まれた設定を確認します。
