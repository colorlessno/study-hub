# aws07 Lambda最小API 要件定義

## 1. 目的

Lambdaのイベント入力、handler、レスポンス、ログ出力を、ローカル疑似実行で体験する。

## 2. 学習対象

- Lambda handler
- event、context
- API Gateway proxy event
- cold startの入口
- timeout、memory、環境変数
- AWS SAM CLIによる`sam local invoke`

## 3. 要件

- Lambda関数はローカルで擬似イベントを入力して実行できる。
- AWS SAM CLIがある場合は`sam local invoke`を優先する。
- SAM CLIがない場合はNodeまたはPythonの小さなwrapperでhandlerを直接呼び出す。
- 実AWSへのデプロイは発展課題として分け、課金、権限、削除手順を明記する。
- 実秘密情報、実AWS認証情報は使わない。

## 4. 成果物

- Lambda handler要件
- サンプルイベント
- ローカル実行手順
- SAM CLI有無による代替手順

## 5. 完了条件

- eventから入力値を取り出してレスポンスを返せる。
- ローカルでLambda相当の実行結果を確認できる。
- timeout、memory、環境変数の意味を説明できる。
