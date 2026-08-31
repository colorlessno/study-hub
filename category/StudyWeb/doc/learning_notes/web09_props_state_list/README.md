# web09 Reactのデータ受渡し・状態・一覧表示

Reactのprops、state、配列処理、条件付き描画を、タスク一覧の表示フィルタで学ぶテーマです。

## このテーマでできるようになること

- 「すべて」「未完了」「完了」を選び、表示内容と件数が変わることを確認できる
- propsが親部品から子部品へデータを渡すための値であることを確認できる
- stateが現在選ばれている表示条件を保持していることを確認できる
- AppからTaskList、TaskItemへタスクが渡る順番をソースで確認できる

## 最初に取り組むこと

次の順番で確認する。

1. 開発サーバーを起動し、「すべて」「未完了」「完了」を順に押して件数の変化を確認する。
2. `App.tsx`でfilterをstateとして保持し、値から`filteredTasks`を作る流れを確認する。
3. `App → TaskList → TaskItem`を辿って表示データがpropsで渡る流れを確認し、`App → FilterButtons`では現在値とevent handlerが渡ることを確認する。
4. TaskのIDをkeyに使う箇所を確認し、並べ替えや削除がある一覧で配列indexをkeyにしない理由を確認する。

## 起動方法

実装ディレクトリで実行します。

```bash
npm install
npm run dev
```

型チェックと本番ビルドの確認には次を使います。

```bash
npm run build
```

## データの流れ

```text
FilterButtonsのclick
  ↓ onChange
AppのsetFilter
  ↓ state変更
filteredTasksを再計算
  ↓ props
TaskList
  ↓ task props
TaskItem
```

## 観察ポイント

| 選択 | 期待件数 | 条件 |
|---|---:|---|
| すべて | 4件 | 全件 |
| 未完了 | 2件 | `done === false` |
| 完了 | 2件 | `done === true` |

- 選択中のボタンだけ`active`クラスになるか
- filter変更のたびに表示対象が切り替わるか
- 期限があるタスクだけ期限が表示されるか
- Reactのkey警告がConsoleに出ていないか

## 自分の言葉で説明する

- filter stateを`FilterButtons`ではなく`App`が持つ理由は何ですか。
- propsが下向き、操作通知が上向きに流れる様子を説明してください。
- `useMemo`の依存配列が`[filter]`である理由は何ですか。

## うまく動かないとき

- 画面が起動しない場合は、ターミナルのVite・TypeScriptエラーを最初に確認します。
- ボタンが反応しない場合は、`onClick`、`onChange`、`setFilter`を順に追います。
- 件数が違う場合は、固定データの`done`とfilter条件を表で照合します。
