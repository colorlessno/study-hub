# web21 基本設計
## DevToolsで通信確認

---

## 1. システム構成設計

### 1.1 全体構成

```text
ブラウザ DevTools
  ↑
React Frontend
  ↓ fetch
NestJS API
  ├─ success endpoint
  └─ error endpoints
```

### 1.2 コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| Frontend | 成功/失敗APIを呼び出す |
| Debug API | 200/400/404/500 を返す |
| DevTools | Request / Response / Status 確認 |
| README | 切り分け手順を説明 |

---

## 2. 主要設計方針

### 2.1 デバッグ設計方針

- 成功と失敗を意図的に再現できる
- Network タブで URL、Method、Status、Response を確認する
- フロント問題、API問題、URL設定問題を切り分ける

### 2.2 画面設計方針

- 成功APIボタンと失敗APIボタンを分ける
- レスポンス内容とエラー内容を画面に表示する

---

## 3. IF仕様

### 3.1 エンドポイント一覧

| メソッド | パス | 役割 |
|---|---|---|
| GET | `/debug/success` | 200確認 |
| GET | `/debug/bad-request` | 400確認 |
| GET | `/debug/not-found` | 404確認 |
| GET | `/debug/server-error` | 500確認 |

### 3.2 画面イベントIF

| 操作 | 処理 | 出力 |
|---|---|---|
| 成功ボタン | success API呼び出し | 成功表示 |
| 失敗ボタン | error API呼び出し | エラー表示 |

---

## 4. 処理フロー

```text
ボタンクリック
  ↓
fetch 実行
  ↓
Network タブにリクエスト表示
  ↓
status と response を画面に表示
  ↓
原因を切り分け
```

---

## 5. データ設計

DBは使用しない。

| データ | 保持場所 | 用途 |
|---|---|---|
| responseBody | Frontend state | 結果表示 |
| statusCode | Frontend state | ステータス表示 |
| errorMessage | Frontend state | エラー表示 |

---

## 6. プロンプト・AI制御設計

AI処理は使用しない。

---

## 7. ガードレール・エラー処理設計

- API URL誤りを再現できる説明をREADMEに書く
- CORSと404の違いを確認できるようにする
- API停止時のエラー表示を用意する

---

## 8. 非機能・運用設計

- Docker Compose で起動できる
- DevTools を使った手動確認を前提にする
- 学習用の固定エラーだけを提供する

---

## 9. 技術スタック

| 用途 | 技術 |
|---|---|
| Frontend | React |
| API | NestJS |
| 通信 | Fetch API |
| 確認 | DevTools Network |

---

## 10. 画面一覧

| 画面名 | 目的 | 備考 |
|---|---|---|
| 通信デバッグ画面 | 成功/失敗通信を確認 | ボタン操作 |

---

## 11. 権限制御

認証・認可は扱わない。

---

## 12. 主要導線

| 導線 | 内容 |
|---|---|
| 成功確認 | 200 API 呼び出し |
| 失敗確認 | 400/404/500 呼び出し |
| 切り分け | Network の Status/Response を見る |

---

## 13. 画面遷移図

```text
通信デバッグ画面
  ├─ success表示
  └─ error表示
```

---

## 14. 画面項目定義

| 項目 | 種別 | 内容 |
|---|---|---|
| API操作ボタン | button | 各API呼び出し |
| ステータス表示 | text | HTTP status |
| レスポンス表示 | pre | JSON本文 |
| 調査メモ | text | 見るポイント |

---

## 15. シーケンス図

```text
学習者 -> React: APIボタンクリック
React -> NestJS: fetch
NestJS -> React: status + JSON
React -> DevTools: Network履歴
React -> 学習者: 結果表示
```
