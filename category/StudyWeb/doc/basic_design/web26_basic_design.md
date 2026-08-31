# web26 基本設計
## Docker Compose Web + API + DB

---

## 1. システム構成設計

### 1.1 全体構成

```text
Browser
  ↓
web service（React）
  ↓
api service（NestJS）
  ↓
db service（PostgreSQL）
```

### 1.2 コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| `web` | フロントエンド |
| `api` | バックエンドAPI |
| `db` | PostgreSQL |
| `docker-compose.yml` | 複数コンテナ定義 |
| `.env` | ポート、接続先設定 |

---

## 2. 主要設計方針

- Web / API / DB を1コマンドで起動する
- コンテナ間通信は service 名を使う
- DBデータは volume で保持する
- ローカル学習用に最小構成にする

---

## 3. IF仕様

### 3.1 サービスIF

| サービス | 公開ポート | 接続先 |
|---|---|---|
| web | 例: 5173 | api |
| api | 例: 3000 | db |
| db | 例: 5432 | api |

### 3.2 API IF

| メソッド | パス | 役割 |
|---|---|---|
| GET | `/health` | API起動確認 |
| GET | `/tasks` | 接続確認用データ取得 |

---

## 4. 処理フロー

```text
docker compose up
  ↓
db 起動
  ↓
api 起動・DB接続
  ↓
web 起動
  ↓
ブラウザからweb表示
  ↓
webがapiを呼ぶ
```

---

## 5. データ設計

DBは接続確認用の Task テーブルを用意する。

| テーブル | 主な保持内容 |
|---|---|
| `tasks` | 接続確認用のタスクデータ |

---

## 6. プロンプト・AI制御設計

AI処理は使用しない。

---

## 7. ガードレール・エラー処理設計

- DB起動前にAPIが接続失敗した場合の再起動手順をREADMEに記載する
- ポート競合時は `.env` で変更できるようにする
- ログ確認コマンドを README に記載する

---

## 8. 非機能・運用設計

- Docker Compose で再現可能にする
- volume でDBデータを保持する
- 起動、停止、ログ確認、再ビルド手順を明記する

---

## 9. 技術スタック

| 用途 | 技術 |
|---|---|
| Frontend | React |
| API | NestJS |
| DB | PostgreSQL |
| コンテナ | Docker Compose |

---

## 10. 画面一覧

| 画面名 | 目的 |
|---|---|
| 接続確認画面 | WebからAPI結果を表示 |

---

## 11. 権限制御

認証・認可は扱わない。

---

## 12. 主要導線

| 導線 | 内容 |
|---|---|
| 起動 | `docker compose up` |
| Web確認 | ブラウザで表示 |
| API確認 | `/health` |
| DB確認 | APIから接続 |

---

## 13. 画面遷移図

```text
接続確認画面
```

---

## 14. 画面項目定義

| 項目 | 種別 | 内容 |
|---|---|---|
| API状態 | text | health結果 |
| DB状態 | text | API経由の接続結果 |

---

## 15. シーケンス図

```text
Browser -> web: page request
web -> api: GET /health or /tasks
api -> db: connection/query
db -> api: result
api -> web: JSON
web -> Browser: result display
```
