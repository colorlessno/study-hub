# web10 詳細設計
## TypeScript型つきデータモデル

## 1. 実装対象

User、Task、Articleの型を別ファイルで定義し、型を付けた固定データをReactコンポーネントへ渡して表示する。

```text
src/frontend/src/studyweb/systems/web10_typescript_model/
├── package.json
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── styles.css
    ├── models/
    │   ├── user.ts
    │   ├── task.ts
    │   └── article.ts
    └── data/
        └── sampleData.ts
```

学習手順は`doc/learning_notes/web10_typescript_model/README.md`に配置する。

## 2. 型定義

### 2.1 User

```ts
type UserRole = "learner" | "mentor" | "admin";

type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  bio?: string;
};
```

`bio`は任意項目である。`role`は3つの許可値だけを受け付ける。

### 2.2 Task

```ts
type TaskStatus = "todo" | "doing" | "done";

type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  assigneeId?: string;
};
```

`assigneeId`は担当者未設定を表せる任意項目である。`status`は3つの許可値だけを受け付ける。

### 2.3 Article

```ts
type Article = {
  id: string;
  title: string;
  summary: string;
  published: boolean;
};
```

`published`は公開状態を真偽値で保持する。

## 3. 固定データ

`sampleData.ts`は次の型を明示した配列をexportする。

| 名前 | 型 | 件数 | 用途 |
|---|---:|---:|---|
| `users` | `User[]` | 2件 | ユーザーカード |
| `tasks` | `Task[]` | 3件 | タスク一覧 |
| `articles` | `Article[]` | 2件 | 記事一覧 |

型に存在しないプロパティ、必須項目の欠落、union型にない文字列はTypeScriptのビルドで検出する。

## 4. 表示コンポーネント

| コンポーネント | props | 表示内容 |
|---|---|---|
| `UserCard` | `user: User` | 名前、メール、役割、任意の自己紹介 |
| `TaskList` | `items: Task[]` | タイトルと日本語化した状態 |
| `ArticleList` | `items: Article[]` | タイトル、公開状態、要約 |

`UserCard`は`bio`が存在する場合だけ段落を描画する。TaskとArticleの状態値は表示用の日本語へ変換する。各配列は`map`で表示し、`id`をReactのkeyに使う。

```text
sampleData.tsから型付き配列を読み込む
  ↓
Appが各表示コンポーネントへpropsを渡す
  ↓
各コンポーネントが型に従って項目を表示する
```

## 5. 入出力と対象外

画面操作と外部入力はなく、固定データを読み取って表示する。HTTP API、データベース、フォーム入力、ランタイムバリデーション、AI処理、認証・認可は使用しない。

TypeScriptの型はコンパイル時の検査であり、外部から受け取ったデータを実行時に検証するものではない。

## 6. エラー確認

| 状況 | 検出方法 |
|---|---|
| 必須プロパティを削除する | TypeScriptの型エラー |
| `status`へ未定義の文字列を指定する | union型の不一致 |
| propsへ異なるデータ型を渡す | コンポーネント呼出し位置の型エラー |
| 依存パッケージがない | Vite起動前に`npm ci`を実行する |

監査ログとHTTPエラー応答は対象外とする。

## 7. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | 画面を表示する | User 2件、Task 3件、Article 2件が表示される |
| `CHK-002` | `bio`と`assigneeId`を確認する | 任意項目の有無を型とデータで説明できる |
| `CHK-003` | UserRoleとTaskStatusを確認する | 許可された文字列だけに限定されている |
| `CHK-004` | `published`の表示を確認する | trueは公開済み、falseは下書きになる |
| `CHK-005` | ソース全体を確認する | `any`を使わずpropsへ型が指定されている |
| `CHK-006` | `npm run build`を実行する | TypeScriptとViteのビルドが成功する |

## 8. 実装との対応

| 設計要素 | 実装箇所 |
|---|---|
| UserとUserRole | `src/models/user.ts` |
| TaskとTaskStatus | `src/models/task.ts` |
| Article | `src/models/article.ts` |
| 型付き固定データ | `src/data/sampleData.ts` |
| 型付きpropsと表示 | `src/App.tsx` |

学習手順と完了条件は[`doc/learning_notes/web10_typescript_model/README.md`](../learning_notes/web10_typescript_model/README.md)を参照する。
