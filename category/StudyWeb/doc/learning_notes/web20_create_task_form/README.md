# web20 Reactフォームからタスクを保存

ReactフォームからNestJS APIへPOSTし、PrismaとPostgreSQLへTaskを保存して一覧を再取得するテーマです。

## このテーマでできるようになること

- 空または空白だけのタイトルが拒否され、正しいタイトルではタスクを作成できることを確認できる
- Network（通信）タブで、POST送信後にGETで一覧を再取得する流れを確認できる
- 画面を再読み込みしても、作成したタスクがDBから再表示されることを確認できる
- ブラウザ・API・DBの間をデータが移動する順番を確認できる

## 事前条件

- Docker Engineが起動していること
- 5180、13020、15420番が利用できること
- 実行対象が学習用DBであること

## 最初に取り組むこと

1. DBとMigrationを準備し、全サービスを起動する。
2. 空または空白だけのtitleを送信し、フロントのエラーを見る。
3. 正常なtitleを作成し、NetworkのPOSTとGETを見る。
4. 再読み込み後もTaskが残ることを確認する。

## 起動方法

`category/StudyWeb/src/infra/compose/web20_create_task_form`で実行します。

```bash
docker compose up -d db
docker compose run --rm migrate
docker compose up --build
```

| 対象 | URL |
|---|---|
| Frontend | `http://localhost:5180` |
| API | `http://localhost:13020/tasks` |

## データの流れ

```text
inputのtitle state
  ↓ JSON POST
NestJS DTO
  ↓ Service
Prisma
  ↓
PostgreSQL
  ↓ GET再取得
React一覧
```

## 観察ポイント

- 空文字と空白だけのtitleがフロントで止まるか
- 正常時のPOSTが201、再取得GETが200になるか
- 保存後に入力欄が空になるか
- 新しいTaskが一覧先頭へ出るか
- ページ再読み込み後もDBのTaskが表示されるか
- APIへ直接、空文字・空白だけのtitle・101文字を送ると400になるか

## 自分の言葉で説明する

- フロントとAPIで二重に検証する理由は何ですか。
- POST成功後にGETを再実行する理由は何ですか。
- web19の固定配列とweb20のDB保存は何が違いますか。

## うまく動かないとき

- Migration未実行の場合はbackendログとDBテーブルを確認します。
- POSTが400ならNetworkのRequest PayloadとDTO制約を確認します。
- 保存されたのに画面へ出ない場合は、POST後のGETとReact stateを確認します。
