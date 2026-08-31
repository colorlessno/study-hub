# web28 基本設計
## .env による設定切り替え

---

## 1. システム構成設計

### 1.1 全体構成

```text
.env / .env.example
  ↓
Docker Compose
  ├─ frontend env
  ├─ backend env
  └─ database env
```

### 1.2 コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| `.env.example` | 設定値の見本 |
| `.env` | ローカル実行用設定 |
| `docker-compose.yml` | 環境変数を各サービスへ渡す |
| Frontend | API URL を参照 |
| Backend | DB接続文字列、ポートを参照 |

---

## 2. 主要設計方針

- API URL、APIポート、DB接続先を環境変数化する
- 秘密情報をコードに直書きしない
- `.env.example` を共有し、`.env` はGit管理しない前提にする
- フロントに公開してよい値とバックエンド専用値を区別する

---

## 3. IF仕様

### 3.1 環境変数IF

| 変数 | 利用先 | 内容 |
|---|---|---|
| `FRONTEND_PORT` | compose | Web公開ポート |
| `API_PORT` | backend/compose | APIポート |
| `API_URL` | frontend | API接続先 |
| `DATABASE_URL` | backend | DB接続文字列 |

---

## 4. 処理フロー

```text
.env を作成
  ↓
docker compose up
  ↓
compose が環境変数を読み込む
  ↓
frontend/backend/db に値を渡す
  ↓
設定値に従って接続
```

---

## 5. データ設計

DBスキーマは主題ではない。設定値を設計対象とする。

---

## 6. プロンプト・AI制御設計

AI処理は使用しない。

---

## 7. ガードレール・エラー処理設計

- `.env` 不足時は起動エラーまたは分かりやすいログを出す
- `.env.example` には秘密情報ではなくダミー値を書く
- README に秘密情報を公開しない注意を書く

---

## 8. 非機能・運用設計

- 設定変更でポートや接続先を切り替えられる
- 学習用に変数数は増やしすぎない
- README に設定項目一覧を記載する

---

## 9. 技術スタック

| 用途 | 技術 |
|---|---|
| 設定 | `.env` |
| 起動 | Docker Compose |
| Frontend | React/Vite |
| Backend | Node.js HTTP server |

---

## 10. 画面一覧

| 画面名 | 目的 |
|---|---|
| 設定確認画面 | API URL の反映を確認 |

---

## 11. 権限制御

認証・認可は扱わない。

---

## 12. 主要導線

| 導線 | 内容 |
|---|---|
| 設定コピー | `.env.example` から `.env` 作成 |
| 起動 | Docker Compose |
| 変更確認 | ポートやAPI URLを変えて動作確認 |

---

## 13. 画面遷移図

```text
設定確認画面
```

---

## 14. 画面項目定義

| 項目 | 種別 | 内容 |
|---|---|---|
| API URL表示 | text | 現在の接続先 |
| API結果 | text | 設定反映確認 |

---

## 15. シーケンス図

```text
開発者 -> .env: 設定値記入
Docker Compose -> service: env渡し
Frontend -> API_URL: 接続先参照
Backend -> DATABASE_URL: DB接続
```
