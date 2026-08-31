# aws06 CloudWatch logs 詳細設計

## 0. 関連文書

- `../requirements/aws06_cloudwatch_logs_requirements.md`
- `../basic_design/aws06_basic_design.md`

## 1. 製造対象

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

## 2. 実装詳細

- Node標準HTTPサーバーで`/health`と`/error`を用意する。
- 各リクエストでrequest idを生成し、応答ヘッダーと本文へ返す。
- 標準出力へ、開始と完了または失敗のJSON Lines形式ログを出す。
- query stringのtokenやemailは記録せず、pathだけをログへ残す。
- CloudWatch Logsのlog group、log stream、eventはdocsでローカルログへ対応付ける。
## 3. 実行コマンド
```cmd
rtk node app\server.js
```

## 4. 確認手順
1. `/health`で開始ログと完了ログが出ることを確認する。
2. `/error`で開始ログと失敗ログが出ることを確認する。
3. それぞれの要求内でrequest idが一致することを確認する。
4. `/sensitive`でquery stringの機密値がログへ出ないことを確認する。
5. 障害調査チェックリストを読む。
## 5. 実AWS発展課題
CloudWatch Logsでlog group、log stream、retention、検索を確認する。ログ量による課金注意を明記する。
## 6. 完了条件

- JSONログの主要項目を説明できる。
- request idでログを追跡できる。
- CloudWatch Logsの基本概念を説明できる。
