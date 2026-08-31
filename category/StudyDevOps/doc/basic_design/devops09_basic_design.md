# devops09 基本設計

## 障害対応記録

## 1. 設計目的

障害時の初動、影響確認、技術調査、一時対応、恒久対応、再発防止をRunbookで確認し、同じ順序で固定シナリオの記録を作成できる教材にする。

## 2. 配置方針

```text
category/StudyDevOps/
  src/apps/devops09_incident_runbook/
    app/
      index.html
      src/main.js
      src/report.js
      src/style.css
    docs/runbook.md
    docs/incident_report_template.md
    docs/docker_investigation_checklist.md
    docs/sample_incident_report.md
  doc/learning_notes/devops09_incident_runbook/
    README.md
```

- 実本番障害ではなく教材シナリオで扱う。
- Docker logs、health endpoint、recent change、CI result を確認順に含める。
- 作成・更新するテキストファイルは UTF-8 BOMなしとする。

## 3. 全体フロー

```text
受付 -> 影響とSeverity -> 変更前の証拠 -> 事実・仮説・判断 -> 対応 -> ブラウザ内保存 -> Markdown出力
```

## 4. コンポーネント

| コンポーネント | 役割 |
|---|---|
| `src/apps/devops09_incident_runbook/app/index.html` | 受付、証拠、判断、対応を4画面に分けて入力する |
| `src/apps/devops09_incident_runbook/app/src/main.js` | 画面遷移、保存、復元、ダウンロードを制御する |
| `src/apps/devops09_incident_runbook/app/src/report.js` | 記録の初期値、検証、Markdown変換を担う |
| `src/apps/devops09_incident_runbook/docs/runbook.md` | 初動から収束までの確認順 |
| `src/apps/devops09_incident_runbook/docs/incident_report_template.md` | 影響、原因、対応、再発防止の記録 |
| `src/apps/devops09_incident_runbook/docs/docker_investigation_checklist.md` | Docker ps/logs/health の確認 |
| `src/apps/devops09_incident_runbook/docs/sample_incident_report.md` | 固定教材シナリオの記入例 |
| `doc/learning_notes/devops09_incident_runbook/README.md` | Runbook の使い方を説明する |

## 5. Docker / CI 方針

- devops08 の Docker logs 調査と接続する。
- devops01 から devops05 の CI/test 結果を Runbook の確認順に入れる。
- 共通CI workflowはRunbook、記入例、記録変換処理を一件ずつ順番に検査する。
- secret、個人情報、実顧客情報を記録しない。
- secrets は incident report、Runbook、Docker調査メモに記録しない。
- 画面入力はサーバーへ送らず、localStorageへ保存する。
- Markdownは利用者がダウンロードを選んだ場合だけ生成する。

## 6. 後続工程への引き継ぎ

詳細設計では、Runbook順、severity分類、チェックリスト、記録テンプレートを具体化する。
