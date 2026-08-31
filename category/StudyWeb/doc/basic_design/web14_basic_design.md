# web14 基本設計
## NestJS POST API

---

## 1. システム構成設計

### 1.1 全体構成

```text
HTTP Client
  ↓ POST /tasks
TasksController
  ↓
CreateTaskDto / ValidationPipe
  ↓
TasksService
  ↓
JSON Response
```

### 1.2 コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| `tasks.controller.ts` | POSTリクエスト受付 |
| `tasks.service.ts` | タスク風データ生成 |
| `create-task.dto.ts` | 入力データ型と検証ルール |
| `tasks.module.ts` | tasks機能のモジュール |

---

## 2. 主要設計方針

### 2.1 API設計方針

- `POST /tasks` でJSONボディを受け取る
- DTOで入力の形を定義する
- タイトル必須などの基本バリデーションを行う

### 2.2 保存方針

- DB保存は行わない
- 受け取ったデータを元に、作成済みタスク風のJSONを返す

---

## 3. IF仕様

### 3.1 エンドポイント一覧

| メソッド | パス | 役割 | 応答方式 |
|---|---|---|---|
| GET | `/tasks/guide` | テーマと操作対象の案内 | 同期 |
| POST | `/tasks` | タスク作成 | 同期 |

### 3.2 リクエスト

| 項目 | 型 | 必須 | 制約 |
|---|---|---|---|
| `title` | string | yes | 空不可、最大文字数あり |
| `description` | string | no | 任意 |

### 3.3 レスポンス

| 項目 | 型 | 内容 |
|---|---|---|
| `id` | string | 生成ID |
| `title` | string | 入力タイトル |
| `description` | string | 入力説明 |
| `createdAt` | string | 作成日時 |

---

## 4. 処理フロー

```text
POST /tasks
  ↓
DTOバリデーション
  ├─ NG: 400
  └─ OK
      ↓
      TasksServiceでレスポンス生成
      ↓
      201 JSON返却
```

---

## 5. データ設計

DBは使用しない。

| データ | 保持場所 | 用途 |
|---|---|---|
| CreateTaskDto | DTO | 入力検証 |
| Task response | Service | 作成結果返却 |

---

## 6. プロンプト・AI制御設計

AI処理は使用しない。

---

## 7. ガードレール・エラー処理設計

- タイトル未入力は 400 を返す
- バリデーションエラーはレスポンスで確認できるようにする
- README に正常系と異常系の curl 例を記載する

---

## 8. 非機能・運用設計

- NestJS + TypeScript を使用する
- `ValidationPipe` を有効化する
- DBに依存しない最小構成にする
- 既定は127.0.0.1の3000番で待ち受け、StudyHub接続時は`PORT`環境変数でテーマ専用ポートへ変更する

---

## 9. 技術スタック

| 用途 | 技術 |
|---|---|
| API | NestJS |
| 言語 | TypeScript |
| バリデーション | class-validator / class-transformer |

---

## 10. 画面一覧

画面は持たない。curl または REST Client で確認する。

---

## 11. 権限制御

認証・認可は扱わない。

---

## 12. 主要導線

| 導線 | 内容 |
|---|---|
| 正常系確認 | 正しいJSONをPOST |
| 異常系確認 | 空タイトルをPOST |
| DTO確認 | 検証ルールを読む |

---

## 13. 画面遷移図

画面遷移はない。

---

## 14. 画面項目定義

画面項目はない。API項目は IF仕様に記載する。

---

## 15. シーケンス図

```text
HTTP Client -> TasksController: POST /tasks
TasksController -> ValidationPipe: DTO検証
ValidationPipe -> TasksController: OK/NG
TasksController -> TasksService: create(dto)
TasksService -> HTTP Client: Task JSON
```
