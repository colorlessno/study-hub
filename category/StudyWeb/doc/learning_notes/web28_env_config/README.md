# web28 環境変数による設定切替

Docker Compose、Vite、Node.jsで環境変数を受け渡し、公開可能な設定とバックエンド専用設定を分けるテーマです。

## このテーマでできるようになること

- サンプルの環境設定ファイルを使ってWebとAPIを起動できる
- 画面でAPIの状態・待受ポート番号・DB設定の有無・メッセージを確認できる
- 環境変数の検証テストを実行し、必須値不足と不正なポート番号が拒否されることを確認できる
- VITE_で始まる値はブラウザへ公開され、DB接続先はAPIだけで使うことを確認できる
- APP_MESSAGEを変更し、ソースを変えずに画面のメッセージを切り替えた

## 最初に取り組むこと

次の順番で確認する。

1. backendの単体testを実行し、必須値、port範囲、responseへ公開する値の制限を確認する。
2. `.env.example`を指定してComposeを起動し、Webと`/config-check`に表示される値を比較する。
3. APP_MESSAGEを変更して再起動し、環境変数が動作へ反映されることを確認する。
4. frontendへ渡る`VITE_`付き変数を確認し、秘密情報に使えない理由を確認する。
5. Composeの必須指定とdefault指定を比較し、`.env.example`には本物のpasswordを置かないことを確認する。

## 起動方法

`category/StudyWeb/src/infra/compose/web28_env_config`で、サンプル環境変数ファイルを明示して実行します。

```bash
docker compose --env-file ../../env/web28_env_config/.env.example up --build
```

| 対象 | URL |
|---|---|
| Web | `http://localhost:5188` |
| API health | `http://localhost:13028/health` |
| 設定確認 | `http://localhost:13028/config-check` |

## 設定項目

| 変数 | 利用場所 | Browserへ値が見えるか |
|---|---|---|
| `FRONTEND_PORT` | Composeのport公開 | 接続先として分かる |
| `API_PORT` | Composeのport公開 | 接続先として分かる |
| `API_INTERNAL_PORT` | backendとCompose | config-checkに数値が出る |
| `VITE_API_URL` | frontend bundle | 見える |
| `DATABASE_URL` | backend | 値そのものは返さない |
| `APP_MESSAGE` | backend | config-checkへ表示する |

BackendはDATABASE_URLの有無だけを`hasDatabaseUrl`として返し、接続文字列自体は返しません。現サンプルはDBへ実際には接続しません。

## 観察ポイント

- 必須のFRONTEND_PORT、API_PORT、VITE_API_URL、DATABASE_URLがないとComposeが停止するか
- API_INTERNAL_PORTとAPP_MESSAGEは既定値を持つか
- VITE_API_URLが画面とBrowser bundleへ公開されるか
- DATABASE_URLの内容がAPIレスポンスに出ないか
- PORTが1〜65535の整数でない場合にbackendが終了するか

## 自分の言葉で説明する

- Build時にBrowserへ埋め込む値と、backendだけが持つ値を説明してください。
- `.env`と`.env.example`の公開範囲をどう分けますか。
- DATABASE_URLを値ではなくbooleanだけ返す理由は何ですか。

## うまく動かないとき

- Compose開始前に失敗する場合は、必須変数と`--env-file`の相対パスを確認します。
- frontendだけAPIへ接続できない場合は、VITE_API_URLとAPI_PORTを照合します。
- backendが終了する場合は、missing envとInvalid PORTのログを確認します。
