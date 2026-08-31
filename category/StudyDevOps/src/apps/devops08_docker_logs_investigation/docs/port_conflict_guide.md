# port競合の切り分け

この資料は、Compose起動時にhost portのbind errorが出た場合の確認順です。競合を意図的に発生させず、既に表示されたエラーと現在の利用状況から判断します。

## 1. 対象を確認する

```bat
cd /d C:\work\work20260617
rtk docker compose --parallel 1 -p studyhub-devops08 -f category/StudyDevOps/src/apps/devops08_docker_logs_investigation/docker-compose.yml ps -a
```

`app-ok`はhost port 18088、`app-runtime-error`はhost port 18089を使用します。

## 2. 使用中のportを確認する

```bat
rtk netstat -ano | findstr :18088
rtk netstat -ano | findstr :18089
```

LISTENING行のPIDを記録し、対象processの所有者と用途を確認します。PIDだけを根拠にprocessを停止しません。

## 3. Composeのエラーと対応付ける

- `address already in use`または`port is already allocated`があるか。
- エラーに表示されたhost portと`netstat`のportが一致するか。
- 既存processがこの教材のものか、別の利用中serviceか。

別serviceが使用中なら停止せず、教材側のport変更または実行延期を判断します。このテーマが起動した環境だけを停止する場合は、次を実行します。

```bat
rtk docker compose --parallel 1 -p studyhub-devops08 -f category/StudyDevOps/src/apps/devops08_docker_logs_investigation/docker-compose.yml down --remove-orphans
```

未確認のcontainer、process、volumeを一括削除しません。
