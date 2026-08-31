# aws01 IAM / 権限の基本 基本設計
## 0. 関連文書

- `../requirements/aws01_iam_basics_requirements.md`

## 1. 設計方針
実AWS操作ではなく、IAMポリシーの読み取り、権限設計、権限不足時の切り分けを学習対象にする。アプリ実行ロール、開発者・閲覧者・管理者の区分、最小権限を設計表で確認する。
## 2. ローカル学習方式
- 架空AWSリソースをJSONで定義する。
- IAM policy例を複数用意し、許可・拒否の判定表を作る。
- 実AWS CLIや認証情報は使わない。
## 3. 成果物構成

```text
doc/learning_notes/aws01_iam_basics/
  README.md
  docs/
src/backend/src/studyaws/systems/aws01_iam_basics/
  package.json
  Dockerfile or docker-compose.yml where applicable
  app/ api/ web/ src/ scripts/ events/ data/ storage as required by the local sample
src/infra/aws01_iam_basics/
  template.yaml where applicable
```

## 4. 設計内容

| 要素 | 内容 |
|---|---|
| ロール | `app-role`, `developer`, `readonly`, `admin`を比較する |
| リソース | S3相当、ログ相当、DB相当の架空ARNを使う |
| 判定 | action、resource、effectを表で確認する |
| 注意 | access keyを成果物に置かない |

## 5. 実AWS発展課題
- IAM Policy SimulatorまたはAWS CLIで同等の権限確認を行う。
- 実施時は検証用アカウント、最小権限、削除手順を用意する。
## 6. 完了条件

- User、Role、Policyの違いを説明できる。
- ポリシーJSONを読み、許可範囲を説明できる。
- 権限不足時の確認項目を説明できる。
