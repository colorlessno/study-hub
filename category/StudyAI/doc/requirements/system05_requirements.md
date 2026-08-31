# System 05 要件定義

## このテーマでできるようになること

- 要件定義で扱う「AIの役割範囲・RAG要件・ガードレール要件」を説明できる
- 基本設計で扱う「埋め込みモデル・pgvector・LlamaIndex・Jinja2フロントエンド設計」を説明できる
- 詳細設計で扱う「RAG詳細設計・メモリ設計（短期）・JSON出力固定（SOAP形式）」を説明できる
- 実装で扱う「RAGパイプライン実装・faster-whisper実装・Jinja2フロントエンド実装・定期実行（APScheduler）・pg_dumpバックアップ実装・MLflowトレース」を説明できる
- 検証で扱う「ガードレール検証（禁忌事項フラグ検証）」を説明できる
- FastAPI・Jinja2フロントエンド・PostgreSQL・SQLAlchemy・Pythonを横断的に使う構成を説明できる

## 個人経営整体院向け 院内電子カルテシステム

---

## システム概要

個人経営の整体院向けに、施術記録（SOAP形式）・患者情報・予約管理を一元管理する電子カルテシステム。LLMが施術メモからSOAP形式のカルテを自動生成し、過去の施術履歴から次回施術の提案を行う。院内端末からの予約受付、ローカルバックアップ機能を含む。

---

## 現状の課題

- 手書きカルテの管理・検索が煩雑で時間がかかる
- 施術メモをSOAP形式のカルテに清書する工数がかかる
- 患者ごとの施術履歴・身体状態の変化を把握しにくい
- 次回施術の方針を毎回一から考える必要がある
- 予約管理が手帳やメモで行われていて二重予約・漏れが発生する

---

## 対象ユーザー

- 整体院の院長・施術者（主要ユーザー）
- 受付スタッフ（予約管理側）
- 患者（院内端末での予約入力側）

---

## SOAP形式について

> 📝 **SOAP（ソープ）**
> 整体・医療現場でのカルテ記述形式。以下の4項目で構成される。
> - **S（Subjective）**：患者が訴える主観的情報（主訴・自覚症状・生活習慣）
> - **O（Objective）**：施術者が観察した客観的情報（姿勢・可動域・圧痛部位・筋緊張）
> - **A（Assessment）**：評価・診断（状態の判断・問題点の整理・施術効果の評価）
> - **P（Plan）**：施術計画（今回の施術内容・次回の方針・患者への指導内容）

---

## 機能要件

### 1. 患者管理機能
患者の基本情報を管理する。

| 項目 | 説明 |
|------|------|
| 患者ID | 自動採番 |
| 氏名 | 患者名（カナ含む） |
| 生年月日・年齢 | 自動計算 |
| 性別 | 男性・女性・その他 |
| 連絡先 | 電話番号・メールアドレス |
| 住所 | 任意 |
| 職業 | 任意（姿勢・疲労の参考情報） |
| 初診日 | 自動記録 |
| 来院回数 | 自動集計 |
| アレルギー・禁忌事項 | 施術上の注意事項 |
| 担当施術者 | 担当者名 |

### 2. SOAP形式カルテ自動生成機能（LLM）
施術後に音声または箇条書きメモを入力すると、LLMがSOAP形式のカルテを自動生成する。

**入力形式**
- テキスト入力（箇条書き・自然文）
- 音声入力（faster-whisperで文字起こし後にLLM処理）

**自動生成されるSOAPカルテ項目**

| SOAP項目 | 含まれる内容 |
|---------|------------|
| S（主観的情報） | 主訴・自覚症状・痛みの強さ（NRS）・発症時期・増悪緩解因子・生活習慣・既往歴 |
| O（客観的情報） | 姿勢観察・可動域・圧痛部位・筋緊張・歩行状態・特殊テスト結果 |
| A（評価） | 状態の評価・問題点の整理・前回からの変化・施術効果の評価 |
| P（計画） | 今回の施術内容・手技・時間・次回施術方針・患者への自宅指導内容 |

**生成例**
```
入力（施術メモ）：
「右肩こりひどい。NRS7/10。デスクワーク多い。
 頸椎4番あたり圧痛。右回旋制限あり。
 僧帽筋ほぐし20分。頸椎モビライゼーション。
 NRS3まで下がった。次は背中もやる。
 ストレッチ指導した」

↓ LLMがSOAP形式に構造化

S：右肩の強いこり・痛み（NRS 7/10）。デスクワークが多く慢性的に続いている。
O：頸椎4番周辺に著明な圧痛あり。右回旋可動域制限を認める。右僧帽筋に強い筋緊張あり。
A：デスクワークによる姿勢不良が原因と考えられる右肩こり・頸椎機能障害。施術後NRS 3/10まで改善。
P：右僧帽筋マッサージ（20分）・頸椎モビライゼーション実施。次回は背部（胸椎周辺）の施術を追加予定。肩甲骨ストレッチを自宅指導済み。
```

### 3. 次回施術提案機能（LLM + RAG）
過去の施術履歴・身体状態の変化をRAGで参照し、LLMが次回施術の提案を生成する。

**提案内容**
- 前回からの身体状態の変化予測
- 重点的に施術すべき部位・手技の提案
- 注意すべき事項（禁忌・リスク）
- 施術時間の目安
- 患者への自宅指導内容の提案

### 4. 予約管理機能
患者の予約を管理する。

| 項目 | 説明 |
|------|------|
| 予約日時 | 日付・開始時刻・終了時刻 |
| 患者名 | 予約患者の紐付け |
| 施術メニュー | 整体・骨盤矯正・スポーツマッサージ等 |
| 担当施術者 | 担当者 |
| 予約状況 | 予約済・来院済・キャンセル・無断キャンセル |
| メモ | 予約時の申し送り事項 |

**予約管理の機能**
- 空き枠の確認・表示
- 重複予約の自動チェック
- 予約一覧のカレンダービュー
- キャンセル待ち管理

### 5. 院内予約受付機能（ブラウザ）
院内ネットワーク内のブラウザから患者が予約入力できる機能。

- 空き枠の確認・選択
- 施術メニューの選択
- 患者情報の入力（初回）または患者IDでの呼び出し（再診）
- 再診時は `患者ID + 生年月日` または `患者ID + 電話番号下4桁` で本人確認する
- 予約確認画面
- 予約完了後の確認番号発行

### 6. フロントエンド（Web画面）
院内PC・タブレットから操作できるWeb画面を提供する。

**院長・施術者向け画面**

| 画面 | 機能 |
|------|------|
| ダッシュボード | 本日の予約一覧・直近の通知 |
| 患者検索・一覧 | 患者の検索・一覧表示 |
| 患者詳細 | 患者情報・施術履歴・次回提案の表示 |
| カルテ入力 | 施術メモの入力・SOAP自動生成・確認・保存 |
| カルテ閲覧 | 過去カルテのSOAP形式表示 |
| 予約管理 | カレンダービュー・予約の追加・変更・キャンセル |
| 統計レポート | 月次来院数・売上・患者属性 |
| バックアップ管理 | バックアップの実行・履歴確認 |

**患者向け画面（院内予約受付）**

| 画面 | 機能 |
|------|------|
| 空き枠確認 | カレンダーで空き枠を確認 |
| 予約入力 | メニュー選択・患者情報入力 |
| 予約確認・完了 | 予約内容の確認・確認番号の表示 |

**フロントエンド技術**
- HTML + CSS + JavaScript（シンプル構成）
- FastAPIのJinja2テンプレートで提供
- レスポンシブ対応（タブレット・PC）

### 7. ローカルバックアップ機能
院内PCへの自動バックアップを行う。

| 項目 | 説明 |
|------|------|
| バックアップ対象 | PostgreSQLのDB全体 |
| バックアップ先 | 院内PC内の指定フォルダ（例：D:\backup\sekkotsu） |
| バックアップ頻度 | 毎日1回（深夜0時）・手動実行も可能 |
| バックアップ形式 | pg_dumpによるSQLファイル（圧縮） |
| 世代管理 | 直近30日分を保持。古いものは自動削除 |
| バックアップ確認 | バックアップ完了・失敗のログを記録 |
| リストア手順 | 管理画面からリストア手順の確認が可能 |

### 8. 施術履歴検索機能
- 患者名・症状・施術部位・期間で検索
- 特定の症状・手技の施術実績を集計
- 来院頻度・リピート率の集計

### 9. 統計・レポート機能
- 月次来院数・売上集計
- 患者属性（年齢・性別・主訴）の分布
- リピート率・来院間隔の統計
- 人気施術メニューのランキング

### 10. 監査・訂正履歴機能
- 保存済みカルテを修正した場合、修正前後の内容・修正理由・修正者・修正日時を履歴として保持する
- 患者情報参照、カルテ参照、カルテ更新、予約更新、バックアップ実行を監査ログに記録する
- カルテ履歴は患者詳細画面から参照できるようにする

### 11. 認証・権限制御機能
- 施術者、受付担当、管理者の3ロールを定義する
- 施術者は患者情報・カルテ・次回施術提案を扱えるが、バックアップ設定変更はできない
- 受付担当は予約管理を扱えるが、SOAP本文の閲覧・編集はできない
- 管理者は監査ログ・バックアップ履歴・復旧手順を確認できる
- 患者向け院内端末は予約受付専用とし、カルテ・履歴にはアクセスさせない

---

## 非機能要件

| 項目 | 要件 |
|------|------|
| 応答時間 | カルテ生成：60秒以内 |
| セキュリティ | 患者情報は院内ネットワーク内のみで完結。外部送信なし。ログ出力時は氏名・電話番号をマスクする |
| 個人情報 | 医療情報を含むため完全ローカル運用 |
| アクセス制御 | 施術者 / 受付担当 / 管理者のロールで操作を制御する |
| 対応言語 | 日本語 |
| 動作環境 | 院内PCのローカル環境（インターネット接続不要） |
| バックアップ | 毎日自動バックアップ・30世代保持・月1回の復旧手順確認 |

---

## システム構成

```
【院長・施術者】          【患者】
ブラウザ（院内PC）        ブラウザ（院内PC・タブレット）
        ↓                        ↓
    ┌─────────────────────────────────────┐
    │  FastAPI（ローカルAPIサーバー）        │
    │  + Jinja2（フロントエンド提供）        │
    └─────────────────────────────────────┘
        ↓
    ┌──────────────────────────────────┐
    │  カルテ生成フロー                  │
    │  施術メモ（テキスト/音声）          │
    │  → faster-whisper（音声の場合）   │
    │  → LLM（SOAP形式カルテ生成）      │
    │     Qwen3-27B / LM Studio        │
    │  → Pydantic（バリデーション）      │
    │  → PostgreSQL（カルテ保存）       │
    └──────────────────────────────────┘
        ↓
    ┌──────────────────────────────────┐
    │  次回施術提案フロー               │
    │  患者IDを指定                    │
    │  → pgvectorで過去カルテ検索      │
    │  → LLM（次回施術提案生成）        │
    └──────────────────────────────────┘
        ↓
    ┌──────────────────────────────────┐
    │  バックアップフロー               │
    │  APScheduler（深夜0時）          │
    │  → pg_dump実行                  │
    │  → 院内PCの指定フォルダに保存     │
    │  → 30世代を超えた古いファイル削除  │
    └──────────────────────────────────┘
```

---

## 画面構成（フロントエンド）

```
/                        ダッシュボード（本日の予約・通知）
/patients                患者一覧・検索
/patients/{id}           患者詳細（情報・施術履歴・次回提案）
/patients/{id}/records   施術履歴一覧
/records/new             カルテ入力（メモ入力→SOAP生成→確認→保存）
/records/{id}            カルテ詳細（SOAP形式表示）
/appointments            予約管理（カレンダービュー）
/appointments/new        予約追加
/stats                   統計レポート
/backup                  バックアップ管理
/booking                 患者向け予約受付（空き枠確認・予約入力）
```

---

## API仕様

### POST /patients
患者を登録する。

### GET /patients
患者一覧を取得する（検索・フィルタ対応）。

### GET /patients/{patient_id}
患者詳細を取得する。

### POST /records/generate
施術メモからSOAPカルテを自動生成する。

**リクエスト（JSON）**
```json
{
  "patient_id": 1,
  "session_date": "2024-04-01",
  "duration_minutes": 60,
  "menu": "整体60分",
  "memo": "右肩こりひどい。NRS7/10。デスクワーク多い。頸椎4番圧痛。右回旋制限。僧帽筋20分。頸椎モビライゼーション。NRS3まで改善。次は背中もやる。ストレッチ指導した。",
  "fee": 7000
}
```

**レスポンス（JSON）**
```json
{
  "record_id": 1,
  "patient_id": 1,
  "session_date": "2024-04-01",
  "menu": "整体60分",
  "fee": 7000,
  "soap": {
    "s": "右肩の強いこり・痛み（NRS 7/10）。デスクワークが多く慢性的に続いている。",
    "o": "頸椎4番周辺に著明な圧痛あり。右回旋可動域制限を認める。右僧帽筋に強い筋緊張あり。",
    "a": "デスクワークによる姿勢不良が原因と考えられる右肩こり・頸椎機能障害。施術後NRS 3/10まで改善。",
    "p": "右僧帽筋マッサージ（20分）・頸椎モビライゼーション実施。次回は背部施術を追加予定。肩甲骨ストレッチを自宅指導済み。"
  }
}
```

### POST /records/generate/voice
音声ファイルをアップロードしてSOAPカルテを生成する。

### PATCH /records/{record_id}
保存済みカルテを修正する。修正時は修正理由を必須とし、訂正履歴を残す。

### GET /records/{record_id}/history
対象カルテの訂正履歴を取得する。

### GET /patients/{patient_id}/suggestion
次回施術の提案を取得する。

### POST /appointments
予約を登録する。

### GET /appointments
予約一覧を取得する（カレンダー形式対応）。

### GET /appointments/available-slots
空き枠一覧を取得する（オンライン予約用）。

### PATCH /appointments/{appointment_id}/status
予約状況を更新する。

### POST /backup/run
手動バックアップを実行する。

### GET /backup/history
バックアップ履歴を取得する。

### GET /stats/monthly
月次統計を取得する。

---

## データモデル

### patientsテーブル
```sql
CREATE TABLE patients (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    name_kana    VARCHAR(100),
    birth_date   DATE,
    gender       VARCHAR(10),
    phone        VARCHAR(20),
    email        VARCHAR(255),
    occupation   VARCHAR(100),
    allergies    TEXT,
    cautions     TEXT,
    first_visit  DATE,
    visit_count  INTEGER DEFAULT 0,
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW()
);
```

### treatment_recordsテーブル
```sql
CREATE TABLE treatment_records (
    id               SERIAL PRIMARY KEY,
    patient_id       INTEGER REFERENCES patients(id),
    session_date     DATE NOT NULL,
    menu             VARCHAR(100),
    duration_minutes INTEGER,
    fee              NUMERIC(10,0),
    memo_raw         TEXT,
    soap_s           TEXT,   -- Subjective
    soap_o           TEXT,   -- Objective
    soap_a           TEXT,   -- Assessment
    soap_p           TEXT,   -- Plan
    embedding        VECTOR(1536),
    created_at       TIMESTAMP DEFAULT NOW()
);
```

### record_revisionsテーブル
```sql
CREATE TABLE record_revisions (
    id             SERIAL PRIMARY KEY,
    record_id      INTEGER NOT NULL REFERENCES treatment_records(id),
    revision_no    INTEGER NOT NULL,
    before_record  JSONB NOT NULL,
    after_record   JSONB NOT NULL,
    reason         TEXT NOT NULL,
    updated_by     VARCHAR(100) NOT NULL,
    updated_at     TIMESTAMP DEFAULT NOW()
);
```

### appointmentsテーブル
```sql
CREATE TABLE appointments (
    id           SERIAL PRIMARY KEY,
    patient_id   INTEGER REFERENCES patients(id),
    start_time   TIMESTAMP NOT NULL,
    end_time     TIMESTAMP NOT NULL,
    menu         VARCHAR(100),
    therapist    VARCHAR(100),
    status       VARCHAR(20) DEFAULT '予約済',
    memo         TEXT,
    booking_no   VARCHAR(20) UNIQUE,   -- 予約受付の確認番号
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW()
);
```

### backup_logsテーブル
```sql
CREATE TABLE backup_logs (
    id          SERIAL PRIMARY KEY,
    file_path   VARCHAR(500),
    file_size   BIGINT,
    status      VARCHAR(20),   -- success / error
    error_msg   TEXT,
    executed_at TIMESTAMP DEFAULT NOW()
);
```

### access_audit_logsテーブル
```sql
CREATE TABLE access_audit_logs (
    id            SERIAL PRIMARY KEY,
    actor_role    VARCHAR(20) NOT NULL,
    actor_id      VARCHAR(100),
    action        VARCHAR(50) NOT NULL,
    target_type   VARCHAR(50) NOT NULL,
    target_id     VARCHAR(100),
    result        VARCHAR(20) NOT NULL,
    detail        JSONB,
    created_at    TIMESTAMP DEFAULT NOW()
);
```

---

## プロンプト仕様

### SOAPカルテ生成プロンプト
```
あなたは整体院のカルテ記録を専門とするAIです。
施術者が入力した施術メモを、SOAP形式（S・O・A・P）に構造化してください。

患者情報：
- 氏名：{patient_name}（{age}歳・{gender}）
- 注意事項：{cautions}

過去の施術記録（直近3回）：
{recent_records}

施術メモ：
{memo}

SOAP形式の定義：
S（Subjective）：患者が訴える主観的情報（主訴・自覚症状・NRS・生活習慣・既往歴）
O（Objective）：施術者が観察した客観的情報（姿勢・可動域・圧痛・筋緊張・検査結果）
A（Assessment）：状態の評価・問題点の整理・前回からの変化・施術効果の評価
P（Plan）：今回の施術内容・手技・次回方針・患者への自宅指導内容

ルール：
1. メモに記載された内容のみを根拠にすること
2. 記載がない項目は「記録なし」とすること
3. 医学的に正確な用語を使用すること
4. 患者の禁忌事項を必ずPの注意事項に反映すること
5. 必ず指定のJSONフォーマットで返すこと
```

---

## ガードレール設計

- JSON形式が壊れていた場合：最大3回まで再試行
- 患者の禁忌事項に反する施術内容が含まれる場合：警告フラグを付与
- 個人情報・医療情報は院内ネットワーク外に送信しない
- 音声ファイルは文字起こし後に即削除
- バックアップ失敗時はログに記録してダッシュボードに警告表示
- 重複予約は自動チェックで防止

---

## 技術スタック

| 用途 | 技術 |
|------|------|
| APIサーバー | FastAPI |
| フロントエンド | Jinja2テンプレート + HTML/CSS/JavaScript |
| LLM | Qwen3-27B（Q4量子化）/ LM Studio経由（完全ローカル） |
| 音声文字起こし | faster-whisper（完全ローカル） |
| 埋め込みモデル | nomic-embed-text（ローカル）/ LM Studio経由 |
| ベクトルDB | pgvector（PostgreSQL拡張） |
| RAGフレームワーク | LlamaIndex |
| 出力バリデーション | Pydantic |
| DB | PostgreSQL |
| ORM | SQLAlchemy |
| バックアップ | pg_dump + APScheduler |
| トレース・ログ | MLflow |

---

## 対応する知識マップ項目

| 工程 | 習得できる知識マップ項目 |
|------|----------------------|
| 工程1：要件定義 | AIの役割範囲・RAG要件・ガードレール要件 |
| 工程2：基本設計 | 埋め込みモデル・pgvector・LlamaIndex・Jinja2フロントエンド設計 |
| 工程3：詳細設計 | RAG詳細設計・メモリ設計（短期）・JSON出力固定（SOAP形式） |
| 工程4：実装 | RAGパイプライン実装・faster-whisper実装・Jinja2フロントエンド実装・定期実行（APScheduler）・pg_dumpバックアップ実装・MLflowトレース |
| 工程5：検証 | ガードレール検証（禁忌事項フラグ検証） |
| 横断 | FastAPI・Jinja2フロントエンド・PostgreSQL・SQLAlchemy・Python |

---

## 対象外（スコープ外）

- 院外公開の予約受付
- 決済機能
- レセプト・保険請求機能
- 他院・他システムとのデータ連携
- クラウド保存・外部バックアップ

## 学習完了の目安

- [ ] 工程1：要件定義：AIの役割範囲・RAG要件・ガードレール要件
- [ ] 工程2：基本設計：埋め込みモデル・pgvector・LlamaIndex・Jinja2フロントエンド設計
- [ ] 工程3：詳細設計：RAG詳細設計・メモリ設計（短期）・JSON出力固定（SOAP形式）
- [ ] 工程4：実装：RAGパイプライン実装・faster-whisper実装・Jinja2フロントエンド実装・定期実行（APScheduler）・pg_dumpバックアップ実装・MLflowトレース
- [ ] 工程5：検証：ガードレール検証（禁忌事項フラグ検証）
- [ ] 横断：FastAPI・Jinja2フロントエンド・PostgreSQL・SQLAlchemy・Python
