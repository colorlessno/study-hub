# devops09 詳細設計

## 障害対応記録

## 1. 実装配置

```text
category/StudyDevOps/src/apps/devops09_incident_runbook/
  app/index.html
  app/src/main.js
  app/src/report.js
  app/src/style.css
  docs/runbook.md
  docs/incident_report_template.md
  docs/docker_investigation_checklist.md
  docs/sample_incident_report.md
category/StudyDevOps/doc/learning_notes/devops09_incident_runbook/
  README.md
```

## 2. Runbook構成

| 章 | 内容 |
|---|---|
| 初動 | 受付、影響、緊急度 |
| 状況確認 | health、logs、CI、recent change |
| 技術調査 | frontend、API、DB、Docker |
| 一時対応 | workaround、restart判断 |
| 恒久対応 | code/config修正 |
| 再発防止 | test、monitoring、手順修正 |
| 記入例 | 固定障害を事実・仮説・判断へ分けた例 |

## 3. severity分類

| severity | 条件 | 対応 |
|---|---|---|
| S1 | 全停止、データ消失懸念 | 即時共有、暫定回避 |
| S2 | 主要機能停止 | 原因調査、回避策提示 |
| S3 | 一部機能の不具合 | 通常対応 |

## 4. Docker checklist

```text
docker compose ps
docker compose logs --tail 100 <service>
curl /health
curl /ready
recent image / env / compose diff
```

## 5. incident report template

| 項目 | 内容 |
|---|---|
| 概要 | 何が起きたか |
| 影響 | 誰に何が起きたか |
| 原因 | 技術原因 |
| 一時対応 | 実施した回避策 |
| 恒久対応 | 修正内容 |
| 再発防止 | 追加する test / Runbook |

## 6. 安全性

- secrets、個人情報、実顧客情報を記録しない。
- 障害メモに token、password、接続文字列を貼らない。
- restartや設定変更前に証拠と戻し方を記録する。
- テキストファイルは UTF-8 BOMなしで保存する。

## 7. 画面構成

| 手順 | 入力内容 |
|---|---|
| 受付 | Incident ID、受付時刻、検知経路、担当、影響、Severity |
| 証拠 | health、ready、containerの状態、request ID、CIと直近変更 |
| 判断 | 確認できた事実、原因の仮説と反証方法、判断と根拠 |
| 対応・保存 | 一時対応、回復確認、恒久対応、再発防止 |

一度に一手順だけを表示し、上部の手順ボタンまたは前後ボタンで切り替える。

## 8. 保存と出力

- 保存キーは`studyhub:devops09:incident-report`とする。
- 保存対象は画面の入力値と保存日時だけとする。
- 読み込みに失敗した場合は固定シナリオの初期値を表示する。
- 保存前とMarkdown出力前に、Incident ID、Severity、事実、判断の入力を確認する。
- Markdownはブラウザ内で生成し、サーバーへの送信やリポジトリへの書き込みを行わない。
- 共通CI workflowはRunbook、固定シナリオの記入例、`report.js`を順番に存在確認する。
