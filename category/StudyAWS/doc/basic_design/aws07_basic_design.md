# aws07 Lambda最小API 基本設計

## 0. 関連文書

- `../requirements/aws07_lambda_local_api_requirements.md`

## 1. 設計方針
Lambdaのhandler、event、context、responseをローカルで体験する。AWS SAM CLIがある場合は`sam local invoke`、ない場合はhandler直接呼び出しで代替する。
## 2. ローカル学習方式
- `template.yaml`を用意し、SAM CLI利用時の入口を作る。
- `events/hello.json`を入力イベントにする。
- `local_invoke.js`でhandlerを直接呼び出す代替手順を用意する。
## 3. 成果物構成

```text
doc/learning_notes/aws07_lambda_local_api/
  README.md
  docs/
src/backend/src/studyaws/systems/aws07_lambda_local_api/
  package.json
  Dockerfile or docker-compose.yml where applicable
  app/ api/ web/ src/ scripts/ events/ data/ storage as required by the local sample
src/infra/aws07_lambda_local_api/
  template.yaml where applicable
```

## 4. 設計内容

| 要素 | 内容 |
|---|---|
| handler | `exports.handler = async (event, context) => {}` |
| event | API Gateway proxy風のJSONを使う |
| response | `statusCode`, `headers`, `body`を返す |
| context | request ID、function名、メモリ上限、残り時間を直接呼出し用に模擬する |
| environment | `GREETING_PREFIX`で環境変数による応答差分を確認する |
| 代替実行 | Nodeでhandlerを直接呼ぶ |

## 5. 実AWS発展課題
- SAM deployまたはAWS Lambda作成は発展課題とする。
- 実施時はIAM、ログ、削除、課金注意を明記する。
## 6. 完了条件

- Lambda handlerの入出力を説明できる。
- SAM CLIなしでもローカルでhandlerを確認できる。
- timeout、memory、環境変数の意味を説明できる。
