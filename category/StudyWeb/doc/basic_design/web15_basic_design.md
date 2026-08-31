# web15 基本設計
## APIエラーパターン確認

---

## 1. システム構成設計

### 1.1 全体構成

```text
HTTP Client
  ↓
NestJS
  └─ ErrorsController
      ├─ 200 OK
      ├─ 400 Bad Request
      ├─ 404 Not Found
      └─ 500 Internal Server Error
```

### 1.2 コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| `errors.controller.ts` | ステータス別APIを提供 |
| `errors.service.ts` | レスポンス生成 |
| `errors.module.ts` | error機能のモジュール |
| `README.md` | 各ステータスの確認方法を説明 |

---

## 2. 主要設計方針

### 2.1 ステータス設計方針

- 200 / 400 / 404 / 500 を固定エンドポイントで再現する
- レスポンス本文で理由を確認できるようにする
- API利用側がステータスを見て処理分岐できる前提を学ぶ

### 2.2 学習方針

- 正常系より異常系の確認に重点を置く
- DBや外部APIに依存しない

---

## 3. IF仕様

### 3.1 エンドポイント一覧

| メソッド | パス | 役割 | ステータス |
|---|---|---|---|
| GET | `/status/ok` | 正常レスポンス | 200 |
| GET | `/status/bad-request` | 不正リクエスト例 | 400 |
| GET | `/status/not-found` | 未検出例 | 404 |
| GET | `/status/server-error` | サーバーエラー例 | 500 |

### 3.2 エラーレスポンス

| 項目 | 型 | 内容 |
|---|---|---|
| `statusCode` | number | HTTPステータス |
| `message` | string | エラー内容 |
| `error` | string | エラー種別 |

---

## 4. 処理フロー

```text
HTTP Clientがエンドポイントを呼ぶ
  ↓
ErrorsController
  ↓
ステータスに応じた例外またはレスポンスを生成
  ↓
HTTPレスポンス返却
```

---

## 5. データ設計

DBは使用しない。固定レスポンスのみ扱う。

---

## 6. プロンプト・AI制御設計

AI処理は使用しない。

---

## 7. ガードレール・エラー処理設計

- 500 は学習用に明示的に発生させる
- README で本番では意図的な500を公開しないことを説明する
- curl でステータスコードを確認する手順を記載する

---

## 8. 非機能・運用設計

- NestJS + TypeScript を使う
- ステータス再現を固定化し、学習しやすくする
- DBや外部サービスに依存しない

---

## 9. 技術スタック

| 用途 | 技術 |
|---|---|
| API | NestJS |
| 言語 | TypeScript |
| 確認 | curl / REST Client |

---

## 10. 画面一覧

画面は持たない。APIレスポンスを確認する。

---

## 11. 権限制御

認証・認可は扱わない。

---

## 12. 主要導線

| 導線 | 内容 |
|---|---|
| 200確認 | `/status/ok` |
| 400確認 | `/status/bad-request` |
| 404確認 | `/status/not-found` |
| 500確認 | `/status/server-error` |

---

## 13. 画面遷移図

画面遷移はない。

---

## 14. 画面項目定義

画面項目はない。API項目は IF仕様に記載する。

---

## 15. シーケンス図

```text
HTTP Client -> ErrorsController: GET /status/*
ErrorsController -> NestJS Exception: 必要に応じて例外生成
NestJS -> HTTP Client: status code + JSON
```
