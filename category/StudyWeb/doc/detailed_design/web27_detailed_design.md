# web27 詳細設計
## Nginx 静的配信 + APIリバースプロキシ

---

## 1. 実装ディレクトリ構成

```text
category/StudyWeb/
├── src/infra/compose/web27_nginx_static_reverse_proxy/docker-compose.yml
├── src/infra/nginx/web27_nginx_static_reverse_proxy/nginx/default.conf
├── src/frontend/static/studyweb/systems/web27_nginx_static_reverse_proxy/web/
│   ├── index.html
│   └── style.css
├── src/backend/src/studyweb/systems/web27_nginx_static_reverse_proxy/api/
│   ├── Dockerfile
│   └── server.js
└── doc/learning_notes/web27_nginx_static_reverse_proxy/README.md
```

## 2. モジュール詳細

| モジュール | 役割 | 主な処理 |
|---|---|---|
| Nginx | 静的配信とAPI転送 | `root`、`try_files`、`proxy_pass` |
| Web | HTML/CSS/JavaScript | 画面表示と`fetch("/api/health")` |
| API | Node.js HTTP server | `GET /health`のJSON応答とその他の404 |
| Compose | 2 serviceの起動 | `nginx`と`api`を同一networkへ配置する |

## 3. API 詳細

| Browserからのパス | Nginxの処理 | 転送先・出力 |
|---|---|---|
| `/` | Nginx static | index.html |
| `/style.css` | Nginx static | CSS |
| `/api/health` | `location /api/`の`proxy_pass` | `api:3000/health`のhealth JSON |

## 4. 詳細API I/O 定義

| 入力 | 処理 | 出力 |
|---|---|---|
| GET `/` | static file | HTML |
| GET `/api/health` | `/api/`を`/`に置き換えてproxy | HTTP 200と`{ "status": "ok", "service": "web27-api" }` |
| GET `/api/<unknown>` | proxy先のAPIが404応答 | HTTP 404と`{ "error": "not_found" }` |

## 5. 入力チェック仕様
| 対象 | ルール |
|---|---|
| Nginx設定 | `nginx -t`で構文が有効 |
| `proxy_pass` | Composeのservice名`api`とport 3000を指す |
| static root | `index.html`と`style.css`が存在する |

## 6. エラー応答仕様
| 応答・現象 | HTTP | 発生条件 |
|---|---|---|
| Nginxの404ページ | 404 | 静的ファイルもfallbackも見つからない |
| NginxのBad Gateway | 502 | APIコンテナが停止し、接続が拒否される |
| Gateway Timeout | 504 | proxy先接続または読取りが制限時間を超える |
| Compose起動失敗 | なし | Nginx設定が不正でコンテナを起動できない |

## 7. バリデーション一覧

| 対象 | 確認 |
|---|---|
| Nginx | `docker compose config`と起動ログ |
| `/` | HTMLとCSSが200で表示される |
| `/api/health` | API JSONとHTTP 200 |
| 転送失敗 | API停止後に画面が502または504のstatusと本文を表示する |
| ログ | APIログとNginx access/error logを順に確認する |

## 8. データベース詳細

DBは使用しない。
## 9. AI 処理詳細

AI処理は使用しない。
## 10. エラー・監査設計
- Nginx access/error log を確認する
- 監査ログは扱わない
## 11. DDL

DBを使用しないためDDLはない。
## 12. 実装メモ

- `proxy_pass http://api:3000/`の末尾`/`により、`/api/health`は`/health`へ書き換えられる
- Browserはホストの`localhost:8087`だけへ通信し、Compose内の`api:3000`はNginxだけが使う
- HTTPS/TLSは対象外
- 学習手順と障害確認は[`README.md`](../learning_notes/web27_nginx_static_reverse_proxy/README.md)を参照する
