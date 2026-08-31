# web13 基本設計
## NestJS Hello API

---

## 1. システム構成設計

### 1.1 全体構成

```text
HTTP Client
  ↓ GET /hello
NestJS
  ├─ AppController
  └─ AppService
      ↓
JSON Response
```

### 1.2 コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| `main.ts` | NestJSアプリ起動 |
| `app.module.ts` | ルートモジュール |
| `app.controller.ts` | GET API の受付 |
| `app.service.ts` | レスポンスデータ生成 |

---

## 2. 主要設計方針

### 2.1 API設計方針

- `GET /hello` でJSONを返す
- Controller はリクエスト受付に集中する
- Service は返却データの作成を担当する

### 2.2 学習方針

- NestJS の Controller / Service / Module の役割を最小構成で確認する
- DBや認証は入れない
- 既定は127.0.0.1の3000番で待ち受け、StudyHub接続時は`PORT`環境変数でテーマ専用ポートへ変更する

---

## 3. IF仕様

### 3.1 エンドポイント一覧

| メソッド | パス | 役割 | 応答方式 |
|---|---|---|---|
| GET | `/hello` | メッセージJSON取得 | 同期 |

### 3.2 レスポンス

| 項目 | 型 | 内容 |
|---|---|---|
| `message` | string | Helloメッセージ |
| `sample` | string | サンプル名 |
| `timestamp` | string | 現在時刻 |

---

## 4. 処理フロー

```text
GET /hello
  ↓
AppController
  ↓
AppService
  ↓
JSONレスポンス
```

---

## 5. データ設計

DBは使用しない。レスポンスデータはServiceで生成する。

---

## 6. プロンプト・AI制御設計

AI処理は使用しない。

---

## 7. ガードレール・エラー処理設計

- 定義されていないパスは NestJS 標準の 404 とする
- 起動ポート使用中の場合は環境変数または設定で変更する
- README に curl での確認方法を記載する

---

## 8. 非機能・運用設計

- NestJS + TypeScript を使用する
- 起動は `npm run start:dev` を基本とする
- 待受先はループバックアドレスに限定する
- API確認はブラウザまたは curl で行う

---

## 9. 技術スタック

| 用途 | 技術 |
|---|---|
| API | NestJS |
| 言語 | TypeScript |
| 実行 | Node.js |

---

## 10. 画面一覧

画面は持たない。APIレスポンスをブラウザまたは curl で確認する。

---

## 11. 権限制御

認証・認可は扱わない。

---

## 12. 主要導線

| 導線 | 内容 |
|---|---|
| 起動 | `npm run start:dev` |
| 確認 | `GET /hello` を呼ぶ |
| 役割確認 | Controller と Service を読む |

---

## 13. 画面遷移図

画面遷移はない。

---

## 14. 画面項目定義

画面項目はない。APIレスポンス項目は IF仕様に記載する。

---

## 15. シーケンス図

```text
HTTP Client -> AppController: GET /hello
AppController -> AppService: getHello()
AppService -> AppController: response object
AppController -> HTTP Client: JSON
```
