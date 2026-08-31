# web19 ReactからAPIを呼んで一覧表示

Reactの`fetch`からNestJS APIを呼び、loading、error、successの状態を切り替えて一覧表示するテーマです。

## このテーマでできるようになること

- 画面で読込中・取得成功・取得失敗の各表示を確認できる
- Network（通信）タブで、タスク取得のGET要求と応答本文を確認できる
- 正常応答に別Originからの通信を許可するヘッダーが含まれることを確認できる
- API停止時の通信エラーを確認し、API再起動後に一覧表示へ戻せる

## 最初に取り組むこと

次の順番で確認する。

1. Composeでfrontendとbackendを起動し、一覧表示とNetworkの`GET /tasks`を確認する。
2. frontendとbackendのport、request、`Access-Control-Allow-Origin`を照合し、別Originの通信が許可される流れを確認する。
3. backendを停止して再読み込みし、通信不能時のerror表示とloading解除を確認する。
4. backendを再起動して正常表示へ戻し、HTTPエラーの判定と通信エラーのcatchを分ける実装を確認する。

## 起動方法

`category/StudyWeb/src/infra/compose/web19_fetch_task_list`で実行します。

```bash
docker compose up --build
```

| 対象 | URL |
|---|---|
| Frontend | `http://localhost:5179` |
| API | `http://localhost:13019/tasks` |

## 状態遷移

```text
初期: loading=true
  ↓ fetch
成功: tasksを保存 → loading=false → 一覧
失敗: errorを保存 → loading=false → エラー表示
```

## 自分の言葉で説明する

- Browser、frontend、backendの3者と2つの公開ポートを説明してください。
- Promise chainのthen、catch、finallyの役割は何ですか。
- 別Originからの通信を許可する応答ヘッダーは何ですか。

## うまく動かないとき

- 画面が開かない場合は`docker compose ps`とfrontendログを確認します。
- API単体が失敗する場合は13019番とbackendログを確認します。
- ブラウザだけ失敗する場合はConsoleのCORSとNetworkのRequest URLを確認します。
