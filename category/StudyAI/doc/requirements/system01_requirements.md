# System 01 要件定義

## このテーマでできるようになること

- 要件定義で扱う「AIの役割範囲の定義・ガードレール要件」を説明できる
- 基本設計で扱う「モデル選定（ローカルLLM）・VLM（マルチモーダル）設計・パイプライン設計」を説明できる
- 詳細設計で扱う「システムプロンプト設計・Few-shot・JSON出力固定・Pydanticスキーマ・再試行ロジック」を説明できる
- 実装で扱う「LLM API実装・VLM実装・Pydantic実装・リトライ・エラーハンドリング・MLflowトレース」を説明できる
- 検証で扱う「ガードレール検証・出力バリデーションテスト」を説明できる
- FastAPI・PostgreSQL・SQLAlchemy・Pythonを横断的に使う構成を説明できる

## 請求書・領収書 データ抽出システム

---

## システム概要

請求書・領収書のPDFや画像ファイルをアップロードすると、LLMが文書を解析し、必要な項目を自動抽出する。抽出結果は人が確認・修正したうえでDB登録・CSV出力に利用する抽出補助ツールであり、経理部門の手入力作業を削減する。

---

## 現状の課題

- 請求書・領収書の手入力による転記ミス・工数の発生
- フォーマットが取引先ごとにバラバラで、統一的な処理が困難
- 紙・PDF・画像など複数形式が混在していて一元管理できていない

---

## 対象ユーザー

- 経理担当者
- 小規模事業者（個人事業主含む）

---

## 機能要件

### 1. ファイルアップロード機能
- 対応形式：PDF・PNG・JPG・JPEG
- 複数ファイルの一括アップロード対応
- ファイルサイズ上限：1ファイルあたり10MB
- 受入対象は原則として1文書あたり10ページ以内

### 2. データ抽出機能
LLMが以下の項目を自動抽出する。

| 抽出項目 | 説明 |
|---------|------|
| 文書種別 | 請求書 / 領収書 / 納品書 の判定 |
| 発行日 | 日付（YYYY-MM-DD形式に統一） |
| 発行元（取引先名） | 会社名・店舗名 |
| 発行元住所 | 任意 |
| 宛先 | 請求先・領収先の名称 |
| 品目・サービス名 | 明細行ごとに抽出 |
| 数量 | 明細行ごとに抽出 |
| 単価 | 明細行ごとに抽出 |
| 小計 | 税抜き合計 |
| 消費税額 | 税率ごとに分けて抽出（8%・10%） |
| 合計金額 | 税込み合計 |
| 支払期限 | 請求書の場合のみ |
| 振込先情報 | 銀行名・支店名・口座種別・口座番号 |
| インボイス登録番号 | 適格請求書発行事業者番号（Tから始まる番号） |

**文書種別ごとの扱い**

| 項目 | 請求書 | 領収書 | 納品書 |
|------|--------|--------|--------|
| 支払期限 | 確認対象 | 対象外 | 対象外 |
| 振込先情報 | 確認対象 | 対象外 | 対象外 |
| インボイス登録番号 | 確認対象 | 任意 | 任意 |

### 3. 抽出結果の確認・修正機能
- 抽出結果をAPIレスポンスで確認できる
- 抽出できなかった項目はNullで返し、信頼度スコアを付与する
- 抽出結果は人の確認を前提とした仮データとして扱う
- 修正データを受け取って再登録できる

### 4. DB登録機能
- 抽出結果をPostgreSQLに仮登録し、人の確認後に利用する
- 確認状態（未確認 / 確認済み）を保持する
- 同一ファイルの物理重複チェックを行う（ファイルハッシュで判定）
- 取引先名・発行日・金額・請求番号の一致に基づく業務上の重複疑いを警告として記録する

### 5. CSV出力機能
- 登録済みデータを条件指定（期間・取引先・金額範囲）でCSV出力する
- デフォルトでは確認済みデータのみを出力対象とする

### 6. 処理ログ機能
- アップロードファイル名・処理日時・抽出成否・エラー内容をログとして保存する

---

## 非機能要件

| 項目 | 要件 |
|------|------|
| 応答時間 | 10ページ以内の1文書あたり30秒以内 |
| 複数ファイル処理 | 最大5ファイルを受付順に処理する |
| セキュリティ | アップロードファイルはサーバー側で処理後に削除 |
| アクセス制御 | 認証・認可は上位システムまたはAPI Gatewayで実施 |
| 対応言語 | 日本語の文書に対応 |

---

## システム構成

```
クライアント（curl / 画面）
        ↓
    FastAPI（APIサーバー）
        ↓
    ファイル前処理
    （PDF→画像変換 / 画像リサイズ）
        ↓
    LLM / VLM（LM Studio経由）
    ※ テキストPDFはLLM、画像系はVLMを使用
        ↓
    出力バリデーション（Pydantic）
    ※ 単票は即時エラー、一括処理はJSON壊れ時に受付順のまま最大3回再試行
        ↓
    PostgreSQL（データ登録）
        ↓
    CSV出力 / APIレスポンス返却
```

---

## API仕様

### POST /extract
ファイルをアップロードしてデータ抽出を実行する。

**リクエスト**
```
Content-Type: multipart/form-data
file: アップロードファイル（PDF / 画像）
```

**レスポンス（JSON）**
```json
{
  "file_name": "invoice_20240401.pdf",
  "document_type": "請求書",
  "issue_date": "2024-04-01",
  "supplier_name": "株式会社サンプル商事",
  "supplier_address": "東京都千代田区〇〇1-1-1",
  "recipient_name": "有限会社テスト",
  "items": [
    {
      "name": "Webシステム開発費",
      "quantity": 1,
      "unit_price": 500000,
      "amount": 500000
    }
  ],
  "subtotal": 500000,
  "tax_8": 0,
  "tax_10": 50000,
  "total": 550000,
  "payment_due": "2024-04-30",
  "bank_info": {
    "bank_name": "サンプル銀行",
    "branch_name": "渋谷支店",
    "account_type": "普通",
    "account_number": "1234567"
  },
  "invoice_number": "T1234567890123",
  "confidence_score": 0.95,
  "requires_review": false,
  "review_status": "未確認",
  "business_duplicate_suspected": false,
  "missing_fields": []
}
```

### POST /extract/bulk
複数ファイルを一括アップロードして抽出を実行する。ジョブ単位で受け付け、結果はファイルごとに返す。

### GET /extract/bulk/{job_id}
一括抽出ジョブの処理状態とファイルごとの結果を取得する。

### PATCH /documents/{document_id}/correct
抽出結果の修正内容と確認状態を反映し、仮登録データを更新する。

### GET /documents
登録済みデータの一覧取得。

**クエリパラメータ**
```
date_from:  開始日（YYYY-MM-DD）
date_to:    終了日（YYYY-MM-DD）
supplier:   取引先名（部分一致）
min_amount: 最小金額
max_amount: 最大金額
review_status: 確認状態（未確認 / 確認済み）
```

### GET /documents/export
CSV形式でエクスポート。クエリパラメータはGET /documentsと同じで、`review_status`を省略した場合は確認済みデータだけを出力する。

---

## データモデル

### documentsテーブル
```sql
CREATE TABLE documents (
    id               SERIAL PRIMARY KEY,
    file_name        VARCHAR(255) NOT NULL,
    file_hash        VARCHAR(64) UNIQUE NOT NULL,  -- 重複チェック用
    document_type    VARCHAR(20),                   -- 請求書 / 領収書 / 納品書
    issue_date       DATE,
    supplier_name    VARCHAR(255),
    supplier_address TEXT,
    recipient_name   VARCHAR(255),
    subtotal         NUMERIC(12,0),
    tax_8            NUMERIC(12,0),
    tax_10           NUMERIC(12,0),
    total            NUMERIC(12,0),
    payment_due      DATE,
    bank_info        JSONB,
    invoice_number   VARCHAR(20),
    confidence_score NUMERIC(3,2),
    requires_review  BOOLEAN DEFAULT FALSE,
    review_status    VARCHAR(20) DEFAULT '未確認', -- 未確認 / 確認済み
    business_duplicate_suspected BOOLEAN DEFAULT FALSE,
    missing_fields   JSONB,
    created_at       TIMESTAMP DEFAULT NOW()
);
```

### document_itemsテーブル（明細行）
```sql
CREATE TABLE document_items (
    id          SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id),
    name        VARCHAR(255),
    quantity    NUMERIC(10,2),
    unit_price  NUMERIC(12,0),
    amount      NUMERIC(12,0)
);
```

### processing_logsテーブル
```sql
CREATE TABLE processing_logs (
    id           SERIAL PRIMARY KEY,
    file_name    VARCHAR(255),
    status       VARCHAR(20),    -- success / error
    error_msg    TEXT,
    processed_at TIMESTAMP DEFAULT NOW()
);
```

---

## プロンプト仕様

### システムプロンプト
```
あなたは請求書・領収書のデータ抽出専門のAIです。
アップロードされた文書画像から、指定された項目を正確に抽出してください。

ルール：
1. 必ず指定のJSONフォーマットで返すこと
2. 読み取れない項目はnullにすること（推測で埋めないこと）
3. 金額は数値のみで返すこと（カンマ・円記号は除く）
4. 日付はYYYY-MM-DD形式に統一すること
5. 文書種別が不明な場合は"不明"とすること
```

### Few-shot設計
正しい出力例・誤った出力例を各3パターンプロンプトに含める。

---

## ガードレール設計

- JSON形式が壊れていた場合：単票は即時エラー、一括処理は受付順のまま最大3回まで再試行
- 信頼度スコアが0.7未満の場合：要確認フラグを付与してレスポンス
- ファイル形式が非対応の場合：即時エラーレスポンスを返す
- 処理時間が30秒を超えた場合：タイムアウトエラーとしてログに記録

---

## 技術スタック

| 用途 | 技術 |
|------|------|
| APIサーバー | FastAPI |
| LLM | Qwen3-27B（Q4量子化）/ LM Studio経由（完全ローカル） |
| VLM（Vision・画像スキャンPDF対応） | Qwen3-VL-32B / LM Studio経由 |
| PDF・画像テキスト抽出 | PyMuPDF（テキストPDF）/ VLM（画像スキャンPDF） |
| 出力バリデーション | Pydantic |
| DB | PostgreSQL |
| ORM | SQLAlchemy |
| トレース・ログ | MLflow |

---

## 対応する知識マップ項目

| 工程 | 習得できる知識マップ項目 |
|------|----------------------|
| 工程1：要件定義 | AIの役割範囲の定義・ガードレール要件 |
| 工程2：基本設計 | モデル選定（ローカルLLM）・VLM（マルチモーダル）設計・パイプライン設計 |
| 工程3：詳細設計 | システムプロンプト設計・Few-shot・JSON出力固定・Pydanticスキーマ・再試行ロジック |
| 工程4：実装 | LLM API実装・VLM実装・Pydantic実装・リトライ・エラーハンドリング・MLflowトレース |
| 工程5：検証 | ガードレール検証・出力バリデーションテスト |
| 横断 | FastAPI・PostgreSQL・SQLAlchemy・Python |

---

## 対象外（スコープ外）

- 画面UI（フロントエンド）
- 会計ソフトとの自動連携
- OCR専用エンジン（LLMのVision機能で代替）
- 電子帳簿保存法への完全対応
- 原本ファイルの長期保管・正本管理

## 学習完了の目安

- [ ] 工程1：要件定義：AIの役割範囲の定義・ガードレール要件
- [ ] 工程2：基本設計：モデル選定（ローカルLLM）・VLM（マルチモーダル）設計・パイプライン設計
- [ ] 工程3：詳細設計：システムプロンプト設計・Few-shot・JSON出力固定・Pydanticスキーマ・再試行ロジック
- [ ] 工程4：実装：LLM API実装・VLM実装・Pydantic実装・リトライ・エラーハンドリング・MLflowトレース
- [ ] 工程5：検証：ガードレール検証・出力バリデーションテスト
- [ ] 横断：FastAPI・PostgreSQL・SQLAlchemy・Python
