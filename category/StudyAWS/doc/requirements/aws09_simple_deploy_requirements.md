# aws09 簡易デプロイ 要件定義

## 1. 目的

小さなWeb/APIをクラウドへ出す時に必要な、ビルド、環境変数、公開URL、ログ確認、削除の流れを学ぶ。

## 2. 学習対象

- buildとruntimeの違い
- environment variables
- health check
- public URL
- rollbackと削除
- Render、Railway、Fly.io、Vercel、AWS App Runnerなどの入口

## 3. 要件

- まずローカルDockerで本番相当の起動を確認する。
- 実クラウドへの公開は発展課題として扱い、サービス候補と注意点を比較する。
- 公開時には、環境変数、ログ、health check、削除手順をREADMEに含める。
- 実秘密情報は置かず、`.env.example`だけを管理する。

## 4. 成果物

- デプロイ前チェックリスト
- ローカル本番相当起動要件
- クラウドサービス比較メモ
- 公開後確認と削除手順

## 5. 完了条件

- ローカル実行と公開環境実行の違いを説明できる。
- 公開前に確認する項目を説明できる。
- 公開後にログとhealth checkを確認できる。
