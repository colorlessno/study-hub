# 障害調査Runbook

ローカル教材シナリオ用の手順です。本番では組織の連絡・承認・保全ルールを優先します。

## 0. 安全確認

- 対象環境、Compose file、service名を確定する。
- secret、token、password、接続文字列、個人情報、実顧客情報を記録しない。
- 全container削除、`docker system prune`、volume削除を初動で実行しない。
- restart、rollback、設定変更の判断者を決める。

## 1. 最初の10分

1. 受付時刻、検知経路、申告された影響を記録する。
2. 調査担当、判断者、共有先を決める。
3. 利用者影響と未確認範囲を分ける。
4. severityを仮決定する。
5. health、ready、container status、直近CIを取得する。
6. restart等の変更前に、時刻・request ID・重要ログ・exit codeを保存する。

## 2. Severity

| Severity | 教材上の目安 | 初動 |
|---|---|---|
| S1 | 全停止、データ消失・漏えいの懸念 | 変更を止め、直ちに判断者へ共有する |
| S2 | 主要機能停止、回避策なし | 影響を継続共有し、回避策とrollbackを検討する |
| S3 | 一部機能停止、ローカル教材の限定障害 | 証拠を保存して通常の調査を進める |

severityは原因の難しさではなく、影響と緊急度で決める。未確認事項が多い場合は過小評価しない。

## 3. 事実を集める

リポジトリルートから、対象を明示して一度ずつ確認する。

```bat
docker compose -f category/StudyDevOps/src/apps/devops08_docker_logs_investigation/docker-compose.yml ps -a
docker compose -f category/StudyDevOps/src/apps/devops08_docker_logs_investigation/docker-compose.yml logs --tail 100 app-runtime-error
curl.exe -i -H "X-Request-Id: req-incident-01" http://localhost:18089/work
```

| 証拠 | 確認すること |
|---|---|
| health | processが応答できるか |
| ready | 依存先を含め利用可能か |
| container status / exit code | 起動前失敗か、起動後失敗か |
| structured log | `timestamp`、`action`、`error_code`、`request_id` |
| CI | 直近変更を自動検証した結果 |
| recent change | image、設定、依存、schemaの変更 |

ログ全文や環境変数一覧を報告書へ貼らず、必要なfieldと保存場所だけを記録する。

## 4. 分岐して調査する

| 状態 | 次に確認すること |
|---|---|
| health応答なし | process、port、起動ログ、exit code |
| health 200 / ready 503 | DB等の依存先、接続可否、timeout |
| health・ready 200 / 操作失敗 | request IDでAPI・画面・DBの処理を追う |
| container exited | startup log、必須設定の有無、entrypoint |
| CI失敗 | 最初に失敗したstepと変更差分 |

仮説ごとに根拠と反証方法を記録し、推測を事実として扱わない。

## 5. 一時対応を判断する

- workaround、traffic停止、restart、rollback、設定修正の順に候補を挙げる。
- 実施前に期待効果、リスク、戻し方、判断者を記録する。
- restartは証拠を消す可能性があり、原因不明の定型操作にしない。
- volume削除やDB初期化は、この教材の一時対応に含めない。

## 6. 回復を確認する

- healthとreadyが期待statusになった。
- 失敗した利用シナリオが再実行できた。
- 新しい500やerror logが増えていない。
- 一時対応による別機能への影響がない。
- 回復時刻と確認者を記録した。

回復確認と原因特定は別々に判断する。復旧しても原因・再発防止が未確認なら報告書へその状態を残す。

## 7. 恒久対応と再発防止

- code、config、dependency、運用手順のどこを直すか決める。
- 再現test、health/readiness、CI、構造化ログのいずれで再発を検出するか決める。
- Runbookと学習ノートを実際の調査結果で更新する。
- 「注意する」ではなく、担当・期限・検証方法を記録する。
