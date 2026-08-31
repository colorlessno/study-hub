# devops01 GitHub Actionsによるビルド確認

ローカルで使うビルド処理をGitHub Actionsからも実行し、同じ確認方法を開発者と自動処理で共有するテーマです。

## このテーマでできるようになること

- package.jsonに定義したビルド処理を実行できる
- GitHub Actionsの処理とローカルの処理を対応付けられる
- working-directoryが処理対象のフォルダを決めることを説明できる
- 成功ログと失敗ログから、止まった処理を分類できる
- Dockerfileで同じビルド確認を再現する流れを説明できる

## 最初に取り組むこと

1. 「ビルドコマンドの定義」でcheckとbuildの関係を確認する。
2. 「ビルド対象のソース」で、実行結果として出力される項目を確認する。
3. 「ローカルでビルドを確認」を実行し、JSON形式の結果を確認する。
4. 「GitHub Actionsの処理対応表」と「実際のGitHub Actions定義」を開き、ソース取得からビルド確認までの順序を追う。
5. 「Dockerによるビルド確認」を開き、依存パッケージ準備とビルド処理の対応を確認する。

## 確認する内容

GitHub Actionsでは、ソース取得、Node.jsの準備、依存パッケージの準備、ビルド確認を順番に行います。GitHub Actionsはpackage.jsonのbuildを実行し、StudyHubはcheckを経由して同じbuildを実行します。

処理ごとに作業フォルダを指定することで、複数の教材があるリポジトリでも対象を取り違えずに実行できます。

成功時は`Run devops01 build`が終了コード0となり、JSONに`"build":"ok"`が表示されます。失敗時は最初に失敗したstep名を確認し、`Install devops01 dependencies`ならlockfileや依存関係、`Run devops01 build`ならpackage.jsonのscriptやソースのエラーを調べます。後続のjobは前のjobが成功した後に一つずつ実行されるため、最初に失敗したjobが調査開始点です。

Dockerでは、このテーマのDockerfileを使って`npm ci`と`npm run build`を同じ順序で実行できます。GitHubへpushしなくても、ローカルコマンドとDockerでビルド処理そのものを確認できます。

## 自分の言葉で説明する

- ローカルとGitHub Actionsで同じ処理を使う利点
- 依存パッケージの準備とビルド確認を分ける利点
- working-directoryを指定する理由
- 失敗したstep名から確認対象を絞り込む方法
