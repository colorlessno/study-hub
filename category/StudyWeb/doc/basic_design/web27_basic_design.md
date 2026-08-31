# web27 基本設計
## Nginx 静的配信 + APIリバースプロキシ

---

## 1. システム構成設計

### 1.1 全体構成

```text
Browser
  ↓
Nginx
  ├─ /        -> 静的ファイル
  └─ /api/*   -> API service
```

### 1.2 コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| Nginx | 静的配信とAPI転送 |
| `default.conf` | リバースプロキシ設定 |
| web files | HTML/CSS/JS |
| API service | JSONレスポンス |
| Docker Compose | Nginx/API起動 |

---

## 2. 主要設計方針

- `/` は Nginx から静的ファイルを返す
- `/api` は API コンテナへ転送する
- Nginx の前段役割を学習できる構成にする
- HTTPSや負荷分散は扱わない

---

## 3. IF仕様

### 3.1 ルーティングIF

| パス | 転送先 | 役割 |
|---|---|---|
| `/` | Nginx static | HTML表示 |
| `/style.css` | Nginx static | CSS表示 |
| `/api/health` | API service | API確認 |

---

## 4. 処理フロー

```text
BrowserがNginxへアクセス
  ├─ / の場合: 静的ファイルを返却
  └─ /api の場合: API serviceへproxy_pass
      ↓
      APIレスポンスをBrowserへ返却
```

---

## 5. データ設計

DBは使用しない。静的ファイルとAPI固定レスポンスのみ扱う。

---

## 6. プロンプト・AI制御設計

AI処理は使用しない。

---

## 7. ガードレール・エラー処理設計

- API service 名の誤りで 502 が出ることを README に記載する
- Nginx 設定変更後は再起動が必要であることを説明する
- アクセスログ確認手順を記載する

---

## 8. 非機能・運用設計

- Docker Compose で Nginx と API を起動する
- Nginx設定ファイルを成果物に含める
- 学習用の最小構成とする

---

## 9. 技術スタック

| 用途 | 技術 |
|---|---|
| Webサーバー | Nginx |
| API | NestJS または簡易API |
| コンテナ | Docker Compose |
| 静的ファイル | HTML/CSS/JS |

---

## 10. 画面一覧

| 画面名 | 目的 |
|---|---|
| 静的ページ | Nginx配信確認 |

---

## 11. 権限制御

認証・認可は扱わない。

---

## 12. 主要導線

| 導線 | 内容 |
|---|---|
| 静的配信確認 | `/` にアクセス |
| API転送確認 | `/api/health` にアクセス |
| ログ確認 | Nginxログを見る |

---

## 13. 画面遷移図

```text
静的ページ
  └─ /api呼び出し結果表示
```

---

## 14. 画面項目定義

| 項目 | 種別 | 内容 |
|---|---|---|
| タイトル | text | Nginx確認 |
| API結果 | text | `/api/health` の結果 |

---

## 15. シーケンス図

```text
Browser -> Nginx: GET /
Nginx -> Browser: index.html
Browser -> Nginx: GET /api/health
Nginx -> API: proxy_pass
API -> Nginx: JSON
Nginx -> Browser: JSON
```
