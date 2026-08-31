# aws06 CloudWatch logs 基本設計

## 0. 関連文書

- `../requirements/aws06_cloudwatch_logs_requirements.md`

## 1. 設計方針
CloudWatch Logsの概念を、ローカルJSONログ、request id、検索観点に置き換えて学ぶ。障害時に何を見るかを手順化する。
## 2. ローカル学習方式
- 小型HTTPサーバーがJSONログを標準出力に出す。
- request idを発行し、各要求の開始ログと完了または失敗ログに含める。
- ログファイルまたは標準出力を検索する。
## 3. 成果物構成

```text
doc/learning_notes/aws06_cloudwatch_logs/
  README.md
  docs/
src/backend/src/studyaws/systems/aws06_cloudwatch_logs/
  package.json
  Dockerfile or docker-compose.yml where applicable
  app/ api/ web/ src/ scripts/ events/ data/ storage as required by the local sample
src/infra/aws06_cloudwatch_logs/
  template.yaml where applicable
```

## 4. 設計内容

| 要素 | 内容 |
|---|---|
| log group相当 | アプリ単位のログ出力として説明する |
| log stream相当 | 起動単位またはコンテナ単位として説明する |
| event | `request.started`と`request.completed`または`request.failed`のJSON 1行ログとして扱う |
| request id | 1リクエストを追跡する |

## 5. 実AWS発展課題
- CloudWatch Logsでlog group、log stream、retention、検索を確認する。
- ログ量に応じた課金注意を明記する。
## 6. 完了条件

- JSONログの主要項目を説明できる。
- request idでログを追跡できる。
- 障害調査時の確認項目を説明できる。
