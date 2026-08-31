# web17 ユーザーとタスクの関連

PrismaでUserとTaskの1対多の関連を定義し、関連データを含む登録・取得を学ぶテーマです。

## このテーマでできるようになること

- 1人のユーザーに複数のタスクを関連付けて取得できることを確認できる
- ユーザーからタスク、タスクからユーザーの両方向で関連データを取得できる
- 不正なメールアドレスと存在しないユーザーIDが拒否されることを確認できる
- Taskが持つuserIdが、UserとTaskを結び付ける外部キーであることを確認できる

## 事前条件

- Docker Engineが起動していること
- 13017番と15417番が利用できること
- 確認用メールアドレスは実行ごとに重複しないこと

## 最初に取り組むこと

次の順番で確認する。

1. StudyHubでDB、Migration、バックエンドを起動し、ユーザーを登録してから、そのIDを持つタスクを登録する。
2. ユーザー一覧・1件表示とタスク一覧を実行し、UserとTaskの関係を両方向から確認する。
3. DB構造の定義で外部キーを持つモデルを確認する。
4. `include`で関連データを同時に取得する処理を確認し、別の要求で後から取得する構成との違いを確認する。

## 起動方法

StudyHubでは「起動」を押し、ユーザー登録、ユーザー表示、タスク登録、タスク表示を順に実行します。終了時は「停止」を押します。

単体で確認する場合は、`category/StudyWeb/src/backend/src/studyweb/systems/web17_relation_user_task`で実行します。

```bat
docker compose up -d db
docker compose run --rm migrate
docker compose up -d backend
```

## 確認コマンド

```bat
curl.exe -i -X POST http://localhost:13017/users -H "Content-Type: application/json" -d "{\"name\":\"Learner\",\"email\":\"learner@example.com\"}"
curl.exe -i -X POST http://localhost:13017/tasks -H "Content-Type: application/json" -d "{\"title\":\"relation確認\",\"userId\":\"USER_ID\"}"
curl.exe -i http://localhost:13017/users
curl.exe -i http://localhost:13017/tasks
```

`USER_ID`はUser作成結果のidへ置き換えます。既に同じemailがある場合は別の値を使用します。

## 観察ポイント

- Userレスポンスにtasks配列が含まれるか
- Taskの応答にuserオブジェクトが含まれるか
- 同じUserへTaskを複数作成できるか
- 存在しないuserIdでTaskを作ると404になるか
- 不正なemailが400になるか
- 同じemailの再作成がDBのunique制約に触れるか

## 自分の言葉で説明する

- UserとTaskの1対多を、主キーと外部キーを使って説明する。
- Task作成前にUserを検索する理由を説明する。
- `include`を常に使う場合の利点と、取得するデータ量の注意点を説明する。

## うまく動かないとき

- Task作成が404なら、User IDを作成レスポンスから再取得します。
- User作成が失敗する場合はemail形式と重複を確認します。
- 関連データが含まれない場合はServiceの`include`を確認します。
