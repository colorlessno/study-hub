# web26_docker_compose_web_api_db 要件定義

## 1. 目的
Docker Compose で Web / API / DB をまとめて起動し、複数コンテナ構成の基本を理解する。

## 2. 対象ユーザー

- ローカル開発環境を Docker で動かしたい人
- フロントエンド、バックエンド、DB の構成を学びたい人
- 「私のPCでは動く」状態から一歩進めたい人

## 3. 作成する成果物

React フロントエンド、NestJS API、PostgreSQL を Docker Compose で起動する構成を作成する。
想定ファイル構成:

```text
src/infra/compose/web26_docker_compose_web_api_db/
  docker-compose.yml
src/frontend/src/studyweb/systems/web26_docker_compose_web_api_db/frontend/
  Dockerfile
src/backend/src/studyweb/systems/web26_docker_compose_web_api_db/backend/
  Dockerfile
category/StudyWeb/doc/learning_notes/web26_docker_compose_web_api_db/
  README.md
```

## 4. 機能要件

### 4.1 コンテナ構成

- Web コンテナを定義すること
- API コンテナを定義すること
- DB コンテナを定義すること
- 各コンテナのポートを明示すること

### 4.2 接続
- Web から API を呼び出せること
- API から DB に接続できること
- 環境変数で接続先を切り替えられること

### 4.3 起動確認
- `docker compose up` で一式起動できること
- ブラウザで Web 画面を確認できること
- API のヘルスチェックを確認できること

## 5. 非機能要件

- Docker Compose を使うこと
- `.env` または compose の environment で設定を管理すること
- DBデータは volume で保持できること
- README に停止・再起動・ログ確認手順を書くこと

## 6. 学習ポイント
- 複数コンテナ構成
- service 名によるコンテナ間通信
- ポートの公開
- volume
- 環境変数

## 7. 完了条件

- Web / API / DB が Docker Compose で起動する
- Web から API の結果を表示できる
- API が DB に接続できる
- README に起動、停止、ログ確認手順がある

## 8. 対象外
- Kubernetes
- CI/CD
- 本番デプロイ
- HTTPS
- 監視基盤
