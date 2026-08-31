# 現在のソースコード横断レビュー

## 結論

初回レビューで、公開前に優先して修正すべきセキュリティ、実行制御、検証自動化上の問題を11件検出した。各項目への実装対応と回帰検証を完了した。PostgreSQLの既定資格情報と教材用ヘッダー認証は、外部公開用の仕組みとして扱わず、ループバックへ限定したローカル教材環境でのみ利用する。

## 対応結果

| No. | 状態 | 対応 |
|---:|---|---|
| 1 | 対応済み | ヘッダー認証を既定で無効化し、Docker教材環境だけで明示的に有効化した。フロントエンドの固定管理者値を環境変数へ移し、公開ポートをループバックへ限定した。 |
| 2 | 対応済み | PostgreSQLを含む全Compose公開ポートを`127.0.0.1`へ限定した。既定資格情報はローカル教材専用であり、外部公開時に環境変数で変更する条件をREADMEへ明記した。 |
| 3 | 対応済み | HTTP(S)以外、認証情報付きURL、localhost、非グローバルIPを拒否し、各リダイレクト先も再検証するようにした。 |
| 4 | 対応済み | DB URLをプロセス引数へ渡さず、パスワードを`PGPASSWORD`で渡すようにした。PostgreSQL custom dumpと`.dump`拡張子を一致させ、回帰テストを追加した。 |
| 5 | 対応済み | 起動確認を2xx応答だけに限定し、「状態を更新」で制限時間付きの実ヘルスチェックを行うようにした。404を拒否する回帰テストを追加した。 |
| 6 | 対応済み | コマンド、タスク、起動待ちのタイムアウトで共通のプロセスツリー停止処理を使用するようにした。 |
| 7 | 対応済み | CIへStudyHubのビルド・全テスト、StudyAIバックエンド全テスト、StudyAIフロントエンドビルドを追加し、共通concurrency groupで順番に実行するようにした。 |
| 8 | 対応済み | MCPの初期化・要求・終了に制限時間と強制終了処理を追加し、無応答プロセスを停止する回帰テストを追加した。 |
| 9 | 対応済み | Cookie保存先をテーマ単位からテーマ・オリジン単位へ分離し、別オリジンへ送信しない回帰テストを追加した。 |
| 10 | 対応済み | `rtk`固定を廃止し、PATH上の標準Pythonまたは`STUDYHUB_PYTHON_COMMAND`で指定した実行ファイルを使用するようにした。 |
| 11 | 対応済み | READMEの開発URLを実際の`npm run dev`の構成に合わせて3100番へ修正した。 |

## 初回指摘事項

### 1. 重大: StudyAIの認証・認可を任意に偽装できる

バックエンドは署名やセッションを検証せず、リクエストの`X-User-Id`と`X-User-Roles`をそのまま信用している。さらにフロントエンドが全利用者を`admin`として送信する。Dockerポートもホストへ公開されているため、到達可能な利用者は管理者権限を自己申告できる。

- `category/StudyAI/src/backend/src/studyai/common/auth/dependencies.py:15`
- `category/StudyAI/src/frontend/src/api/client.ts:4`
- `category/StudyAI/docker-compose.yml:47`

認証済みのID・権限情報だけをバックエンドで受理する構成へ変更し、フロントエンドの固定管理者ヘッダーを削除する必要がある。

### 2. 重大: PostgreSQLが既定パスワードでホスト全体へ公開される

`5432:5432`は通常すべてのホストインターフェースへバインドされ、既定値は`postgres/postgres`である。

- `category/StudyAI/docker-compose.yml:6`
- `category/StudyAI/src/backend/.env.docker:3`

少なくとも`127.0.0.1:5432:5432`へ限定し、固定された既定パスワードを廃止する必要がある。

### 3. 高: Web取得処理にSSRF対策がない

URLのスキーム、名前解決後IP、ループバック・プライベートIPを検証せず、リダイレクトも追跡する。検索結果やリダイレクトを経由して、Docker内部サービスやホスト側サービスへアクセスできる。

- `category/StudyAI/src/backend/src/studyai/common/search/web_fetch_tool.py:10`

各リダイレクト先を含め、許可スキーム、ホスト、名前解決後IPを検証する必要がある。

### 4. 高: DBバックアップで接続パスワードがプロセス引数へ露出する

認証情報を含むDB URL全体を`pg_dump`のコマンドライン引数へ渡している。また、生成物はSQLダンプであるにもかかわらず拡張子が`.json.gz`になっている。

- `category/StudyAI/src/backend/src/studyai/systems/system05/services/backup_service.py:79`

環境変数または`.pgpass`を利用し、ダンプ形式と拡張子を一致させ、復元テストを追加する必要がある。

### 5. 高: 起動確認が404や401でも成功扱いになる

`response.status < 500`なら準備完了になるため、誤ったURLや未実装ルートでも「利用できます」と表示される。また「状態を更新」は実際のヘルスチェックを行わず、キャッシュ済み状態を返すだけである。

- `app/src/server/runtime/manager.ts:980`
- `app/src/server/routes/api.ts:372`

テーマごとに許可する正常ステータスを定義し、「状態を更新」では制限時間付きの実ヘルスチェックを行う必要がある。

### 6. 高: タイムアウト時に子孫プロセスが残る可能性がある

通常停止ではWindowsの`taskkill /T /F`を使用するが、コマンド・タスクのタイムアウト時は`child.kill()`だけである。npmなどが起動した孫プロセスが残り、ポート競合や次回起動失敗につながる。

- `app/src/server/runtime/manager.ts:666`
- `app/src/server/runtime/manager.ts:1058`

タイムアウト時も通常停止と同じプロセスツリー停止処理を使用する必要がある。

### 7. 中: 主要なビルドとテストがCIに含まれていない

`portfolio-validation`は文書・カタログ検証のみで、StudyHubの`npm run build`と`npm test`を実行しない。StudyAIも一部検証スクリプトだけで、バックエンドpytestとフロントエンドビルドがCI対象外である。

- `.github/workflows/portfolio-validation.yml:20`
- `.github/workflows/studyai-learning-validation.yml:41`

StudyHub本体とStudyAIの主要なビルド・テストを、対象ファイルの変更時に必ず実行する必要がある。

### 8. 中: MCP子プロセスが無期限に応答待ちになる

`stdout.readline()`とshutdown要求にタイムアウトがない。子プロセスが生存したまま応答しない場合、API処理または終了処理が停止する。初期化中の例外では子プロセスが残る可能性もある。

- `category/StudyAI/src/backend/src/studyai/common/mcp/filesystem_client.py:21`
- `category/StudyAI/src/backend/src/studyai/common/mcp/filesystem_client.py:94`

初期化、各要求、終了処理へ制限時間を設定し、失敗時に必ず子プロセスを終了する必要がある。

### 9. 中: Cookieが接続先ではなくテーマ単位で共有される

同一テーマ内で異なるポート・サービスへリクエストすると、別オリジンで受け取ったCookieを転送する。

- `app/src/server/runtime/manager.ts:54`
- `app/src/server/runtime/manager.ts:261`

最低でもオリジン単位で管理し、必要に応じてDomain、Path、Secure属性も評価する必要がある。

### 10. 中: WindowsのPython実行が`rtk`に固定されている

PATH上のPythonや`py`ランチャーを利用できない。今回の検証環境でも、pyenvのPythonバージョンが未設定でpytestを実行できなかった。公開利用者向けの前提としてREADMEにも記載されていない。

- `app/src/server/runtime/manager.ts:930`

利用可能なPython実行方法を順番に検出するか、必要環境として明示する必要がある。

### 11. 低: 開発起動手順とnpmスクリプトが一致していない

READMEは`npm run dev`後にポート3000を案内するが、`dev`はフロントエンドを一度ビルドして3100番のサーバーだけを起動し、Viteを起動しない。

- `app/package.json:10`
- `README.md:113`

スクリプトを実際の開発構成へ合わせるか、READMEの案内を修正する必要がある。

## 検証結果

- カタログ検証: 合格（13分野、167テーマ）
- カタログ生成整合: 合格
- StudyHub本番ビルド: 合格
- StudyHubテスト: 合格（実行基盤22件を含む全テスト）
- ポートフォリオ検証: 合格。ただしUTF-8 BOM警告31件
- StudyAIバックエンドpytest: 261件すべて合格（専用Dockerテストイメージ）
- StudyAIフロントエンドビルド: 合格（専用Dockerイメージ）
- StudyAI Compose設定検証: 合格
- 追跡済みファイルから、秘密鍵および代表的なAPIキー形式は検出されなかった

## 良好だった点

- StudyHubの実行コマンドが許可リストで制限されている。
- 子プロセスを`shell: false`で起動している。
- 教材・関連ファイルのパス境界を検証している。
- 実行要求を逐次キューで処理している。
- 厳密なUTF-8読込みとカタログの網羅テストが実装されている。

## Git・公開前整理

追跡済みファイルにレビュー前からの変更はなかった。リポジトリ直下には`{b`、`{const`、`q.fieldId`など既存の未追跡ファイルが残っているため、公開前に由来と要否を確認する必要がある。
