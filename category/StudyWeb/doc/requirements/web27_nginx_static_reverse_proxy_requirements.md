# web27_nginx_static_reverse_proxy 要件定義

## 1. 目的
Nginx で静的ファイル配信と API へのリバースプロキシを行い、Webサーバーが前段にいる構成を理解する。

## 2. 対象ユーザー

- Nginx の基本的な役割を学びたい人
- 静的配信とAPI転送の違いを理解したい人
- Apache / Tomcat 世代の構成感と現代的な構成をつなげたい人

## 3. 作成する成果物

Nginx、静的Web、API を Docker Compose で起動する構成を作成する。
想定ファイル構成:

```text
src/infra/compose/web27_nginx_static_reverse_proxy/
  docker-compose.yml
src/infra/nginx/web27_nginx_static_reverse_proxy/
  default.conf
src/frontend/static/studyweb/systems/web27_nginx_static_reverse_proxy/web/
  index.html
src/backend/src/studyweb/systems/web27_nginx_static_reverse_proxy/api/
category/StudyWeb/doc/learning_notes/web27_nginx_static_reverse_proxy/
  README.md
```

## 4. 機能要件

### 4.1 静的配信

- Nginx から `index.html` を配信すること
- CSS / JavaScript などの静的ファイルも配信できること

### 4.2 API転送
- `/api` へのリクエストを API コンテナへ転送すること
- API のレスポンスをブラウザから確認できること

### 4.3 起動確認
- Docker Compose で Nginx と API を起動できること
- Nginx のログでリクエストを確認できること

## 5. 非機能要件

- Nginx 設定ファイルを成果物に含めること
- リバースプロキシの設定を README で説明すること
- HTTPS は扱わないこと
- 学習用に最小構成にすること

## 6. 学習ポイント
- 静的ファイル配信
- リバースプロキシ
- URLパスによる転送
- Nginx の設定ファイル
- Webサーバーとアプリサーバーの役割分担

## 7. 完了条件

- Nginx 経由で静的ページが表示される
- `/api` 経由で API レスポンスが返る
- README に設定の内容と確認手順がある

## 8. 対象外
- HTTPS / TLS
- ロードバランシング
- キャッシュ制御の詳細
- 認証
- 本番運用
