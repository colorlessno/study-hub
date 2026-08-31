# web25 詳細設計
## Next.jsフォーム送信

## 1. 実装対象

Next.js App Router、Reactの`useActionState`、Server Actionを使い、同一アプリ内でフォーム入力をサーバー側検証し、結果を同じ画面へ表示する。DB保存は行わない。

```text
src/frontend/src/studyweb/systems/web25_next_form_action/
├── package.json
├── next.config.ts
└── app/
    ├── layout.tsx
    ├── page.tsx
    ├── FormClient.tsx
    ├── actions.ts
    └── globals.css
```

| モジュール | 実行環境 | 役割 |
|---|---|---|
| `page.tsx` | Server Component | ページ構造と`FormClient`を配置する |
| `FormClient.tsx` | Client Component | 入力UI、Action接続、pendingと結果を表示する |
| `actions.ts` | Server | FormDataの取得、検証、結果生成を行う |
| `layout.tsx` | Server Component | ルートHTMLと共通CSSを設定する |
| `globals.css` | Browser | フォームと結果の見た目を定義する |
| `next.config.ts` | Next.js | build時の生成処理を1 workerで順次実行する |

## 2. Server Action

`actions.ts`の先頭に`"use server"`を指定し、`createTask`をServer Actionとして定義する。

```ts
type FormState = {
  ok: boolean;
  message: string;
};
```

| 引数 | 型 | 用途 |
|---|---|---|
| `_previousState` | `FormState` | `useActionState`契約上の前回状態。現実装では参照しない |
| `formData` | `FormData` | フォームから送られたtitleとdescription |

| 戻り値 | 条件 | 内容 |
|---|---|---|
| `{ ok: false, message }` | titleが空 | `タイトルを入力してください。` |
| `{ ok: true, message }` | titleあり、descriptionなし | `「{title}」を受け付けました。` |
| `{ ok: true, message }` | title・descriptionあり | 上記に`説明も確認しました。`を追加 |

titleとdescriptionは`FormData.get()`の結果を`String`へ変換し、`trim()`で前後空白を除く。titleが空白だけの場合もエラーとする。

## 3. Client Component

`FormClient.tsx`には`"use client"`を指定する。初期状態は`{ ok: false, message: "" }`とする。

```text
useActionState(createTask, initialState)
  ├── state: 直近のFormState
  ├── formAction: formのactionへ設定する関数
  └── pending: Server Actionの処理中か
```

### 入力項目

| 項目 | DOM | name | 必須扱い |
|---|---|---|---|
| タイトル | `input#title` | `title` | Server Actionで必須検証 |
| 説明 | `textarea#description` | `description` | 任意 |

`label[htmlFor]`と各IDを対応させる。送信中はボタンをdisabledにし、文言を`送信中`へ切り替える。Action完了後、messageが空でない場合だけ結果を描画する。

## 4. 処理フロー

```text
フォームへ入力
  ↓
submit
  ↓
pending=true、ボタン無効化
  ↓
createTask(previousState, FormData)
  ↓
title/descriptionを文字列化してtrim
  ├─ titleなし → ok=false
  └─ titleあり → ok=true
  ↓
state更新、pending=false
  ↓
同一画面に結果を表示
```

独立したREST APIエンドポイントは定義しない。React + NestJS分離構成とは異なり、フォームとサーバー処理をNext.jsアプリ内で関連付ける。

## 5. 表示とエラー設計

| state | CSS class | 表示 |
|---|---|---|
| `message === ""` | なし | 結果要素を描画しない |
| `ok === true` | `result success` | 成功メッセージ |
| `ok === false` | `result error` | 入力エラーメッセージ |

結果要素に`aria-live="polite"`を指定する。現実装で明示的に扱うエラーはtitle未入力だけであり、予期しないServer Action例外向けの独自メッセージは実装しない。

## 6. データ・セキュリティ設計

- 入力値は結果文言の生成にだけ使用し、DBやファイルへ保存しない。
- titleの必須判定をServer Action側で行い、クライアントだけに依存しない。
- descriptionの長さ制限、認証・認可、CSRFの追加対策、監査ログは教材の対象外とする。
- AI処理と外部APIは使用しない。
- Reactの通常の文字列描画を使い、入力をHTMLとして解釈しない。

## 7. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | titleを空で送信する | タイトル入力を求めるエラーが表示される |
| `CHK-002` | 空白だけのtitleを送信する | 未入力としてエラーになる |
| `CHK-003` | titleだけで送信する | titleを含む成功メッセージが表示される |
| `CHK-004` | titleとdescriptionを送信する | 説明確認済みの文言も表示される |
| `CHK-005` | 送信処理中を確認する | ボタンが無効になり`送信中`と表示される |
| `CHK-006` | `npm run build`を実行する | Next.jsが1 workerで生成処理を行い、ビルドが成功する |

## 8. 実装との対応

| 設計要素 | 実装箇所 |
|---|---|
| ページ構造 | `app/page.tsx` |
| フォームとAction state | `app/FormClient.tsx` |
| Server Actionと入力検証 | `app/actions.ts` |
| 共通レイアウト | `app/layout.tsx` |
| 成功・エラーの表示 | `app/globals.css` |

学習手順、故障演習、完了条件は[`doc/learning_notes/web25_next_form_action/README.md`](../learning_notes/web25_next_form_action/README.md)を参照する。
