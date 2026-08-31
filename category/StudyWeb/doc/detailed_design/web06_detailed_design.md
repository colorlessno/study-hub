# web06 詳細設計
## 入力フォームとバリデーション

## 1. 実装対象

4項目の問い合わせフォームを使い、フォーム要素、submitイベント、JavaScriptによる入力検証、項目別エラー表示を学ぶ。外部へのデータ送信は行わない。

```text
src/frontend/src/studyweb/systems/web06_form_basic/
├── index.html
├── styles.css
└── script.js
```

| ファイル | 役割 |
|---|---|
| `index.html` | 入力項目、エラー領域、操作ボタン、結果領域を定義する |
| `styles.css` | フォーム、必須表示、エラー、結果領域を定義する |
| `script.js` | DOM取得、バリデーション、submit/reset処理を実装する |

## 2. HTML詳細

### 2.1 フォーム

`form#contactForm`には`novalidate`を付け、この教材ではブラウザ標準の検証メッセージではなく、JavaScriptの検証結果を観察する。

| 項目 | DOM | name | 種別 | 候補・補足 |
|---|---|---|---|---|
| 名前 | `#name` | `name` | text | `autocomplete="name"` |
| メールアドレス | `#email` | `email` | email | `autocomplete="email"` |
| 問い合わせ種別 | `#category` | `category` | select | `study`、`bug`、`other` |
| 本文 | `#message` | `message` | textarea | 5行表示、縦方向のサイズ変更可 |

### 2.2 出力領域

| 入力 | 項目別エラー | エラーキー |
|---|---|---|
| `#name` | `#nameError` | `name` |
| `#email` | `#emailError` | `email` |
| `#category` | `#categoryError` | `category` |
| `#message` | `#messageError` | `message` |

各エラー領域と`#formResult`には`aria-live="polite"`を指定する。送信ボタンは`type="submit"`、初期化ボタンは`type="reset"`とする。

## 3. CSS詳細

| セレクタ | 用途 |
|---|---|
| `.form-shell` | 最大幅720pxのフォームカード |
| `.field` | ラベル、入力、エラーを項目単位でまとめる |
| `input, select, textarea` | 幅100%と共通の入力スタイル |
| `.error-message` | 項目別エラーの色と表示領域を確保する |
| `.button-row` | submitとresetを折返し可能なFlexboxで配置する |
| `button[type="reset"]` | リセット操作を副次的な見た目にする |
| `.form-result` | フォーム全体の結果を表示する |

`.error-message`には空の状態でも`min-height`を持たせ、エラー表示の有無で周辺レイアウトが大きく移動しないようにする。

## 4. JavaScript詳細

### 4.1 DOM参照と定数

| 名前 | 内容 | 用途 |
|---|---|---|
| `form` | `#contactForm` | submit/resetイベントの登録先 |
| `fields` | 4つの入力DOMを持つオブジェクト | 入力値の取得 |
| `errors` | 4つのエラーDOMを持つオブジェクト | 項目別エラーの表示 |
| `formResult` | `#formResult` | フォーム全体の結果表示 |
| `emailPattern` | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | 簡易的なメール形式チェック |

必須DOMが1つでも取得できない場合はイベントを登録せず、`web06: required element was not found.`をConsoleへ出す。

### 4.2 関数

| 関数 | 入力 | 処理・戻り値 |
|---|---|---|
| `setError(key, message)` | エラーキー、文言 | 対応するエラー領域の`textContent`を更新する |
| `clearMessages()` | なし | 全項目エラーと結果文言を空にする |
| `validate()` | なし | 入力を検証し、すべて正常なら`true`を返す |

`validate()`は最初に前回のメッセージを消去し、全項目を検証する。最初のエラーで停止せず、見つかったエラーをすべて表示する。

### 4.3 バリデーション

| 項目 | 正常条件 | エラー文言 |
|---|---|---|
| 名前 | `trim()`後が空でない | `名前を入力してください。` |
| メール | `trim()`後が空でない | `メールアドレスを入力してください。` |
| メール | `emailPattern`に一致する | `メールアドレスの形式が正しくありません。` |
| 種別 | valueが空でない | `問い合わせ種別を選択してください。` |
| 本文 | `trim()`後が空でない | `本文を入力してください。` |

### 4.4 イベント処理

```text
submit
  ↓
preventDefaultでページ遷移を止める
  ↓
validateを実行
  ├─ false → 「入力内容を確認してください。」を表示
  └─ true  → 「送信内容を確認しました。実際の送信は行っていません。」を表示
```

resetイベントでは、ブラウザが入力値を初期化した直後に`window.setTimeout(clearMessages, 0)`を実行し、項目別エラーと結果文言も消去する。

## 5. データとセキュリティ

- 入力値はブラウザ内のフォーム要素だけに保持し、保存・送信しない。
- HTTP API、データベース、AI処理、認証・認可は使用しない。
- メッセージの描画には`textContent`を使用する。
- 本教材の正規表現は構文確認用の簡易チェックであり、実在するメールアドレスを保証しない。

## 6. アクセシビリティ

- `label[for]`と入力要素のIDを対応させる。
- 必須であることを各ラベル内の文言で示す。
- 項目別エラーを入力欄の直後に配置する。
- 動的メッセージに`aria-live="polite"`を指定する。
- 入力、select、textarea、buttonはブラウザ標準要素を使う。

## 7. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | すべて空のまま送信する | 4項目のエラーと全体エラーが表示される |
| `CHK-002` | メールへ`sample`を入力して送信する | メール形式エラーが表示される |
| `CHK-003` | 前後空白だけの名前・本文を入力する | 未入力として扱われる |
| `CHK-004` | 4項目を正常に入力して送信する | 未送信であることを含む成功文言が表示される |
| `CHK-005` | エラー表示後にリセットする | 入力値、項目別エラー、全体結果が消える |
| `CHK-006` | 必須IDを一時的に変更する | Consoleに固定エラーが出る |

## 8. 実装との対応

| 設計要素 | 実装箇所 |
|---|---|
| 入力項目とエラー領域 | `index.html` |
| フォームとエラーの表示 | `styles.css` |
| DOM存在確認と入力検証 | `script.js` |
| submit/reset処理 | `script.js`のイベントリスナー |

学習手順、故障演習、完了条件は[`doc/learning_notes/web06_form_basic/README.md`](../learning_notes/web06_form_basic/README.md)を参照する。
