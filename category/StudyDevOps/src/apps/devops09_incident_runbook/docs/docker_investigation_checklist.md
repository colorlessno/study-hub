# Docker調査チェックリスト

## 対象を確定する

- [ ] Compose fileの絶対位置またはリポジトリ相対位置
- [ ] service名
- [ ] 公開port
- [ ] 調査時刻

## 変更前の証拠

```bat
docker compose -f <compose-file> ps -a
docker compose -f <compose-file> logs --tail 100 <service>
docker inspect <container> --format "{{.State.Status}} exit={{.State.ExitCode}} restart={{.RestartCount}}"
curl.exe -i http://localhost:<port>/health
curl.exe -i http://localhost:<port>/ready
```

環境変数を全表示しない。必要な設定は値を出さず、有無だけを対象container内で確認する。

```bat
docker compose -f <compose-file> exec <service> sh -c 'test -n "$APP_MODE" && echo APP_MODE=set || echo APP_MODE=missing'
```

## 見るもの

- [ ] container status、exit code、restart count
- [ ] port bind error
- [ ] 必須設定の有無
- [ ] healthとreadyの差
- [ ] `action`、`error_code`、`request_id`
- [ ] recent image / compose / dependency change

## 操作後

- [ ] 実施した操作、判断者、戻し方を記録した
- [ ] health / readyを再確認した
- [ ] 利用シナリオを再実行した
- [ ] 対象Compose環境だけを片付けた

secret、token、password、接続文字列、個人情報を出力・記録しない。全containerや未確認volumeを一括削除しない。
