# web09 詳細設計
## props / state / list表示

## 1. 実装対象

Reactのprops、state、配列の絞込み、リスト描画を、固定タスク4件のフィルタ画面で確認する。

```text
src/frontend/src/studyweb/systems/web09_props_state_list/
├── package.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── types.ts
    ├── styles.css
    └── components/
        ├── FilterButtons.tsx
        ├── TaskList.tsx
        └── TaskItem.tsx
```

| モジュール | 役割 |
|---|---|
| `App` | 元データとfilter stateを保持し、表示対象を計算する |
| `FilterButtons` | 3つの表示条件を描画し、選択値を親へ通知する |
| `TaskList` | タスク配列を一覧化し、0件時の表示を切り替える |
| `TaskItem` | タスク1件のタイトル、期限、状態を表示する |
| `types.ts` | コンポーネント間で共有する型を定義する |

## 2. 型と固定データ

```ts
type Task = {
  id: string;
  title: string;
  done: boolean;
  dueDate?: string;
};

type Filter = "all" | "active" | "done";
```

`App.tsx`に4件の`Task[]`を固定値として保持する。HTTP APIとデータベースは使用せず、追加・更新・削除も対象外とする。

| filter | 対象条件 | 初期データでの件数 |
|---|---|---|
| `all` | 全件 | 4件 |
| `active` | `done === false` | 2件 |
| `done` | `done === true` | 2件 |

## 3. stateと算出値

| 名前 | 型 | 初期値 | 用途 |
|---|---|---|---|
| `filter` | `Filter` | `"all"` | 現在の表示条件 |
| `setFilter` | state更新関数 | Reactが提供 | 子から通知された条件を保存する |
| `filteredTasks` | `Task[]` | filterから算出 | `TaskList`へ渡す表示対象 |

`filteredTasks`は`useMemo`で計算し、依存配列を`[filter]`とする。`tasks`はモジュール定数であり、filter変更時だけ絞込みを再計算する。

```text
FilterButtonsでボタンを押す
  ↓
onChange(filter.value)
  ↓
AppのsetFilter
  ↓
filteredTasksを再計算
  ↓
TaskListとTaskItemを再描画
```

## 4. props設計

| コンポーネント | props | 型・用途 |
|---|---|---|
| `FilterButtons` | `currentFilter` | `Filter`、選択中ボタンの判定 |
| `FilterButtons` | `onChange` | `(filter: Filter) => void`、親stateの更新依頼 |
| `TaskList` | `tasks` | `Task[]`、表示対象の配列 |
| `TaskItem` | `task` | `Task`、1件分の表示データ |

子コンポーネントは受け取ったpropsを変更しない。状態は`App`へ集約し、データは親から子、操作通知は子から親のコールバックという一方向の流れにする。

## 5. 描画詳細

### 5.1 FilterButtons

`all`、`active`、`done`の定義配列を`map`し、valueをReactの`key`にする。選択中のボタンだけ`active`クラスを付ける。ボタン群には`aria-label="表示フィルタ"`を指定する。

### 5.2 TaskListとTaskItem

- 0件なら`条件に合うタスクはありません。`を表示する。
- 1件以上なら`ul.todo-list`を描画し、`task.id`をkeyにする。
- 期限が存在する場合だけ`期限: {dueDate}`を表示する。
- `done`がtrueなら`完了`、falseなら`未完了`を表示し、対応するCSSクラスを付ける。

## 6. 入力・エラー設計

| 対象 | 制約 | 実装上の防止方法 |
|---|---|---|
| filter | 3つの許可値だけ | TypeScriptのunion型と固定ボタン |
| task ID | 一覧内で一意 | Reactのkeyとして使用する固定データ |
| title | 表示可能な文字列 | `Task.title`を必須stringとする |
| dueDate | 未設定を許可 | optionalプロパティと条件付き描画 |

想定外の外部入力はなく、HTTPエラー、監査ログ、AI処理、認証・認可は扱わない。0件は異常ではなくempty stateとして画面内で扱う。

## 7. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | 初期表示する | 「すべて」が選択され、4件表示される |
| `CHK-002` | 「未完了」を押す | 未完了の2件だけになる |
| `CHK-003` | 「完了」を押す | 完了の2件だけになる |
| `CHK-004` | 「すべて」へ戻す | 再び4件表示される |
| `CHK-005` | 固定データを一時的に空配列にする | empty stateが表示される |
| `CHK-006` | ブラウザConsoleを確認する | key警告が出ない |

## 8. 実装との対応

| 設計要素 | 実装箇所 |
|---|---|
| 共有型 | `src/types.ts` |
| stateと絞込み | `src/App.tsx` |
| 操作通知 | `src/components/FilterButtons.tsx` |
| 一覧とempty state | `src/components/TaskList.tsx` |
| 1件表示 | `src/components/TaskItem.tsx` |

学習手順、故障演習、完了条件は[`doc/learning_notes/web09_props_state_list/README.md`](../learning_notes/web09_props_state_list/README.md)を参照する。
