# web13 NestJSの最小API

NestJSのModule、Controller、Serviceの責務分担を、`GET /hello`からJSONを返す最小APIで学ぶテーマです。

## このテーマでできるようになること

- `GET /hello`を呼び、HTTP状態番号200と応答内容を確認できる
- 存在しないURLを呼び、HTTP状態番号404になることを確認できる
- Controllerが要求を受け、Serviceが応答内容を作る流れを確認できる
- ModuleにControllerとServiceが登録され、依存性注入で結び付くことを確認できる

## 最初に取り組むこと

次の順番で確認する。

1. StudyHubでAPIを起動し、「正常な応答を確認」と「未定義のURLを確認」を順に実行する。
2. `/hello`が返す3項目を確認し、日時がISO 8601形式であることを確認する。
3. 要求を受けるControllerから、応答内容を作るServiceまでをソースで辿る。
4. Moduleの登録内容を確認し、ControllerとServiceを依存性注入で結び付ける構成を確認する。

## 起動方法

StudyHubでは「起動」を押し、確認する操作を選んで「実行する」を押します。

単体で確認する場合は、実装ディレクトリで実行します。依存パッケージを初めて準備するときだけ`ci`を実行します。

```bat
rtk npm.cmd ci
rtk npm.cmd run start:dev
```

別のターミナルから確認します。

```bat
curl.exe -i http://localhost:3000/hello
curl.exe -i http://localhost:3000/unknown
```

## 処理の流れ

```text
GET /hello
  ↓
AppController.getHello()
  ↓ DIされたService
AppService.getHello()
  ↓
objectをNestJSがJSONへ変換
  ↓
HTTP 200
```

## 観察ポイント

- `message`と`sample`が固定値か
- `timestamp`がISO形式で、呼出しごとに生成されるか
- 応答のContent-TypeがJSONか
- 未定義パスがNestJS標準の404になるか
- Controllerがレスポンス内容を直接組み立てていないか

## 自分の言葉で説明する

- Module、Controller、Serviceの役割をそれぞれ1文で説明する。
- Controllerが`new AppService()`を実行しない理由を説明する。
- 未定義パスの404がアプリのソースに明示されていない理由を説明する。

## うまく動かないとき

- 起動しない場合は、依存関係、TypeScriptエラー、3000番ポートを確認します。
- 404の場合は、HTTPメソッド、Controllerのパス、呼出しURLを照合します。
- 500またはDIエラーの場合は、Moduleのcontrollers/providers登録を確認します。
