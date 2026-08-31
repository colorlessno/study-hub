# web28_env_config 要件定義

## 1. 目的
`.env` を使って API URL、DB接続先、ポート番号などの設定を切り替える基本を理解する。

## 2. 対象ユーザー

- 環境変数による設定管理を学びたい人
- 開発環境と本番環境の違いを理解したい人
- ハードコードを避ける考え方を身につけたい人

## 3. 作成する成果物

フロントエンド、API、Docker Compose で環境変数を使うサンプルを作成する。
想定ファイル構成:

```text
src/infra/compose/web28_env_config/
  docker-compose.yml
src/infra/env/web28_env_config/
  .env.example
src/frontend/src/studyweb/systems/web28_env_config/frontend/
src/backend/src/studyweb/systems/web28_env_config/backend/
category/StudyWeb/doc/learning_notes/web28_env_config/
  README.md
```

## 4. 機能要件

### 4.1 設定項目

- API URL を環境変数で管理すること
- API ポートを環境変数で管理すること
- DB接続文字列を環境変数で管理すること

### 4.2 サンプルファイル

- `.env.example` を用意すること
- 実際の `.env` はGit管理しない前提を README に書くこと
- 各設定値の意味を説明すること

### 4.3 動作確認
- 環境変数を変更すると接続先やポートが変わること
- 設定不足時にわかりやすいエラーを出すこと

## 5. 非機能要件

- 秘密情報をコードに直書きしないこと
- 学習用のダミー値を使うこと
- フロントエンドに公開してよい値とAPI側だけの値を区別すること
- README に注意点を書くこと

## 6. 学習ポイント
- `.env`
- `.env.example`
- 環境変数
- 設定のハードコードを避ける理由
- フロントエンドとバックエンドの環境変数の違い

## 7. 完了条件

- `.env.example` がある
- 環境変数を使ってアプリが起動する
- 設定変更の反映を確認できる
- README に設定項目と変更手順がある

## 8. 対象外
- 秘密情報管理サービス
- クラウド環境変数設定
- 本番用証明書
- 複雑な設定ライブラリ
- シークレットローテーション
