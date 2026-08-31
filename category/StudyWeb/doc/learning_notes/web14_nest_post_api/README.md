# web14 NestJSのデータ登録API

NestJSのPOSTルート、DTO、class-validator、Global ValidationPipeを使い、入力を検証してタスク作成風JSONを返すテーマです。DB保存は行いません。

## このテーマでできるようになること

- 正しい内容をPOST送信し、登録成功を表すHTTP状態番号201を確認できる
- 空のタスク名を送信し、HTTP状態番号400とエラー内容を確認できる
- DTOに定義されていない項目を送信し、HTTP状態番号400になることを確認できる
- Controller、DTO、Serviceが入力の受け取り・検証・応答作成を分担する流れを確認できる

## 最初に取り組むこと

次の順番で確認する。

1. StudyHubでAPIを起動し、正常なタスク、空のタスク名、DTOにない項目を順に送信する。
2. 正常時の201と入力検証に失敗したときの400を比較する。
3. DTOの制約とValidationPipeの設定を辿り、実行時の入力検証が必要な理由を確認する。
4. Controller、DTO、Serviceのソースを見比べ、入力の受け取りから応答作成までの分担を確認する。

## 起動方法

StudyHubでは「起動」を押し、3種類の操作を順に選んで「実行する」を押します。

単体で確認する場合は、実装ディレクトリで次のコマンドを実行します。web13等が3000番を使用している場合は先に停止します。

```bat
rtk npm.cmd ci
rtk npm.cmd run start:dev
```

### 正常系

```bat
curl.exe -i -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d "{\"title\":\"NestJSを学ぶ\",\"description\":\"POST API確認\"}"
```

### 異常系

```bat
curl.exe -i -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d "{\"title\":\"\"}"
curl.exe -i -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d "{\"title\":\"確認\",\"unexpected\":true}"
```

## 観察ポイント

- 正常時が201になり、IDとcreatedAtが生成されるか
- description省略時に空文字になるか
- title未指定、空文字、81文字以上が400になるか
- descriptionの型不正や201文字以上が400になるか
- DTOに定義されていない項目が400で拒否されるか
- 同じ入力を2回送っても保存されず、別ID風のレスポンスだけ返るか

## 自分の言葉で説明する

- TypeScriptの型とclass-validatorの役割の違いを説明する。
- whitelistとforbidNonWhitelistedを両方使う理由を説明する。
- このAPIを「タスク保存API」と呼べない理由を説明する。

## うまく動かないとき

- JSON構文エラーの場合は、引用符とContent-Typeを確認します。
- 404の場合は、HTTPメソッドと`/tasks`を確認します。
- 検証されない場合は、Global ValidationPipeとDTOデコレーターを確認します。
