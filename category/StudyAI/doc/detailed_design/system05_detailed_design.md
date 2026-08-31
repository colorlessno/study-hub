# System 05 詳細設計
## 個人経営整体院向け 院内電子カルテシステム

---

## 1. 実装ディレクトリ構成

```text
app/
├── api/routes/patients.py
├── api/routes/records.py
├── api/routes/appointments.py
├── api/routes/backup.py
├── api/routes/stats.py
├── schemas/patient.py
├── schemas/record.py
├── services/voice_transcriber.py
├── services/soap_generator.py
├── services/suggestion_service.py
├── services/appointment_service.py
├── services/stats_service.py
├── services/backup_service.py
├── services/audit_log_service.py
├── repositories/patient_repository.py
├── repositories/record_repository.py
├── repositories/revision_repository.py
├── repositories/audit_log_repository.py
└── prompts/medical_prompt.py
```

## 2. モジュール詳細

| モジュール | 役割 | 主な関数 |
|---|---|---|
| PatientController | 患者 CRUD | `create_patient()`, `list_patients()`, `get_patient()` |
| RecordController | SOAP 生成と履歴参照 | `generate_record()`, `generate_record_from_voice()` |
| VoiceTranscriber | 音声文字起こし | `transcribe_audio()` |
| SOAPGenerator | S/O/A/P 生成 | `generate_soap()` |
| SuggestionService | 次回施術提案 | `build_next_visit_suggestion()` |
| AppointmentService | 予約管理 | `create_appointment()`, `list_appointments()`, `update_status()` |
| StatsService | 月次集計 | `get_monthly_stats()` |
| BackupService | SQL バックアップ | `run_backup()`, `list_backup_history()` |
| AuditLogService | 監査ログ記録 | `log_access()`, `log_update()` |
| RevisionRepository | カルテ訂正履歴管理 | `append_revision()`, `list_history()` |

## 3. API 詳細

### 3.1 患者 API
- `POST /patients`: 患者登録
- `GET /patients`: 一覧、氏名・電話番号・来院回数で検索
- `GET /patients/{patient_id}`: 基本情報、直近カルテ、予約一覧を返却

### 3.2 カルテ API
- `POST /records/generate`
  - 入力: メモ本文または構造化項目
  - 応答: SOAP カルテ、注意事項、次回提案候補
- `POST /records/generate/voice`
  - 入力: 音声ファイル
  - 処理: `faster-whisper -> SOAPGenerator`
- `PATCH /records/{record_id}`
  - 入力: 修正対象 SOAP 項目、修正理由
  - 処理: 修正前後差分を `record_revisions` に保存してから更新
- `GET /records/{record_id}/history`
  - 応答: revision_no, reason, updated_by, updated_at, diff_summary
- `GET /patients/{patient_id}/suggestion`
  - 応答: 次回施術候補、理由、注意点、推奨来院間隔

### 3.3 予約・運用 API
- `POST /appointments`
- `GET /appointments`
- `GET /appointments/available-slots`
- `PATCH /appointments/{appointment_id}/status`
- `POST /backup/run`
- `GET /backup/history`
- `GET /stats/monthly`

## 4. 詳細API I/O 定義

### 4.1 患者 API
**対象API**: `POST /patients`, `GET /patients`, `GET /patients/{patient_id}`

| 項目 | 型 | 説明 |
|---|---|---|
| `name`, `name_kana` | string | 氏名情報 |
| `birth_date`, `gender` | string/date | 基本属性 |
| `phone`, `email` | string | 連絡先 |
| `occupation`, `allergies`, `cautions` | string | 問診補助 |
| `visit_count` | integer | 来院回数 |

### 4.2 カルテ生成 API
**対象API**: `POST /records/generate`, `POST /records/generate/voice`, `PATCH /records/{record_id}`, `GET /records/{record_id}/history`, `GET /patients/{patient_id}/suggestion`

| 項目 | 型 | 説明 |
|---|---|---|
| `patient_id` | integer | 患者ID |
| `session_date` | string(date) | 施術日 |
| `duration_minutes` | integer | 施術時間 |
| `menu` | string | 施術メニュー |
| `memo` / `voice_file` | string / binary | 入力メモまたは音声 |
| `soap` | object | `s`, `o`, `a`, `p` |
| `correction_reason` | string | カルテ修正理由 |
| `history[]` | object[] | revision_no, reason, updated_by, updated_at |
| `suggestion` | object | 次回施術提案 |

### 4.3 予約 API
**対象API**: `POST /appointments`, `GET /appointments`, `GET /appointments/available-slots`, `PATCH /appointments/{appointment_id}/status`

| 項目 | 型 | 説明 |
|---|---|---|
| `patient_id` | integer | 患者ID |
| `start_time` / `end_time` | string(datetime) | 予約時間 |
| `menu`, `therapist` | string | メニュー・担当 |
| `status` | string | 予約済 / 来院 / 取消 |
| `available_slots[]` | object[] | 空き枠一覧 |

### 4.4 バックアップ・統計 API
**対象API**: `POST /backup/run`, `GET /backup/history`, `GET /stats/monthly`

| 項目 | 型 | 説明 |
|---|---|---|
| `executed_at` | string(datetime) | バックアップ実行日時 |
| `status` | string | success / error |
| `file_path` | string | 保存先 |
| `monthly_stats` | object | 月次来院数・売上・患者属性分布 |

## 5. 入力チェック仕様
| 対象 | チェック項目 | ルール |
|---|---|---|
| 患者 API | 氏名 | 必須 |
| `POST /records/generate` | `patient_id` と `memo` | 必須 |
| `POST /records/generate/voice` | 音声形式 | 許可形式のみ |
| `PATCH /records/{record_id}` | `correction_reason` | 必須 |
| 予約 API | 予約時間 | `start_time < end_time` |
| `POST /appointments` | 再診本人確認 | `patient_id` 指定時は生年月日または電話番号下4桁必須 |
| `PATCH /appointments/{appointment_id}/status` | 状態 | 許可値のみ |

## 6. エラー応答仕様
共通レスポンス形式:
```json
{"error_code":"string","message":"string","details":{},"trace_id":"string"}
```

| error_code | HTTP | 発生条件 |
|---|---|---|
| `patient_not_found` | 404 | 患者不存在 |
| `invalid_audio_format` | 400 | 音声形式不正 |
| `record_revision_required` | 400 | 修正理由なしの更新 |
| `patient_verification_failed` | 403 | 再診本人確認失敗 |
| `invalid_appointment_slot` | 409 | 予約枠競合 |
| `backup_failed` | 500 | バックアップ失敗 |
| `invalid_model_output` | 422 | SOAP構造不整合 |

## 7. バリデーション一覧
| 対象 | ルール | 不正時挙動 |
|---|---|---|
| `duration_minutes` | 0より大きい | 400 を返す |
| `fee` | 0以上 | 400 を返す |
| `status` | 許可状態のみ | 400 を返す |
| `soap` | `s/o/a/p` 全項目必須 | 再生成 |
| `revision_no` | 1 からの連番 | 保存拒否 |
| `actor_role` | 許可ロールのみ | 403 を返す |

## 8. データベース詳細

### 8.1 `patients`
- `id`, `name`, `kana`, `phone`, `birth_date`, `gender`, `contraindications`, `visit_count`, `created_at`

### 8.2 `treatment_records`
- `patient_id`, `soap_subjective`, `soap_objective`, `soap_assessment`, `soap_plan`
- `suggestion_memo`, `created_by`, `updated_by`, `created_at`, `updated_at`

### 8.3 `record_revisions`
- `record_id`, `revision_no`, `before_record`, `after_record`, `reason`, `updated_by`, `updated_at`

### 8.4 `appointments`
- `patient_id`, `appointment_at`, `menu`, `status`, `channel`, `confirmation_code`

### 8.5 `backup_logs`
- `started_at`, `finished_at`, `status`, `archive_path`, `error_message`

### 8.6 `access_audit_logs`
- `actor_role`, `actor_id`, `action`, `target_type`, `target_id`, `result`, `detail`, `created_at`

## 9. AI 処理詳細

### 9.1 SOAP 出力ルール
- S/O/A/P の 4 項目を必須とする
- 不明項目は空文字ではなく null
- 医療判断の断定表現は禁止し、施術現場の補助記録に限定する

### 9.2 次回施術提案
- 参照データ: 禁忌事項、前回施術内容、来院間隔、施術者メモ
- 出力: `recommended_menu`, `reason`, `cautions`, `target_interval_days`

### 9.3 カルテ修正時のAI非依存ルール
- 保存済みカルテ修正では LLM 再生成を行わず、利用者の修正値を優先する
- 修正差分の要約はアプリケーション側で生成し、`record_revisions` に保存する
- 監査ログには SOAP 本文を全文保存せず、対象IDと操作結果のみ保存する

## 10. バックアップ・統計設計

- 月次統計は `appointments` と `treatment_records` を集計し、専用テーブルは持たない
- バックアップは日次定時 + 手動実行
- バックアップ失敗時は画面に警告表示し、`backup_logs` に詳細を残す
- 復旧は `最新成功バックアップの選定 -> 手順表示 -> 管理者承認` の順で実施する
- 月1回、復旧手順確認結果を監査ログへ記録する

## 11. DDL

### 11.1 `patients`

```sql
CREATE TABLE patients (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(100) NOT NULL,
    kana              VARCHAR(100),
    phone             VARCHAR(20) NOT NULL,
    birth_date        DATE,
    gender            VARCHAR(20),
    contraindications TEXT,
    visit_count       INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patients_name       ON patients(name);
CREATE INDEX idx_patients_phone      ON patients(phone);
CREATE INDEX idx_patients_visit_count ON patients(visit_count);
```

### 11.2 `treatment_records`

```sql
CREATE TABLE treatment_records (
    id               SERIAL PRIMARY KEY,
    patient_id       INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    soap_subjective  TEXT,
    soap_objective   TEXT,
    soap_assessment  TEXT,
    soap_plan        TEXT,
    suggestion_memo  TEXT,
    created_by       VARCHAR(50),
    updated_by       VARCHAR(50),
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_treatment_records_patient_id ON treatment_records(patient_id);
CREATE INDEX idx_treatment_records_created_at ON treatment_records(created_at DESC);
```

### 11.3 `record_revisions`

```sql
CREATE TABLE record_revisions (
    id             SERIAL PRIMARY KEY,
    record_id      INTEGER NOT NULL REFERENCES treatment_records(id) ON DELETE CASCADE,
    revision_no    INTEGER NOT NULL,
    before_record  JSONB NOT NULL,
    after_record   JSONB NOT NULL,
    reason         TEXT NOT NULL,
    updated_by     VARCHAR(100) NOT NULL,
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (record_id, revision_no)
);

CREATE INDEX idx_record_revisions_record_id   ON record_revisions(record_id);
CREATE INDEX idx_record_revisions_updated_at  ON record_revisions(updated_at DESC);
```

### 11.4 `appointments`

```sql
CREATE TABLE appointments (
    id                SERIAL PRIMARY KEY,
    patient_id        INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_at    TIMESTAMP NOT NULL,
    menu              VARCHAR(100) NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    channel           VARCHAR(20) NOT NULL DEFAULT 'staff',
    confirmation_code VARCHAR(50),
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_appointments_status
        CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled'))
);

CREATE INDEX idx_appointments_patient_id     ON appointments(patient_id);
CREATE INDEX idx_appointments_appointment_at ON appointments(appointment_at);
CREATE INDEX idx_appointments_status         ON appointments(status);
```

### 11.5 `backup_logs`

```sql
CREATE TABLE backup_logs (
    id            SERIAL PRIMARY KEY,
    started_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    finished_at   TIMESTAMP,
    status        VARCHAR(20) NOT NULL,
    archive_path  TEXT,
    error_message TEXT,
    CONSTRAINT chk_backup_logs_status
        CHECK (status IN ('running', 'success', 'failed'))
);

CREATE INDEX idx_backup_logs_started_at ON backup_logs(started_at DESC);
```

### 11.6 `access_audit_logs`

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
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_access_audit_logs_result
        CHECK (result IN ('success', 'failed', 'denied'))
);

CREATE INDEX idx_access_audit_logs_created_at ON access_audit_logs(created_at DESC);
CREATE INDEX idx_access_audit_logs_target      ON access_audit_logs(target_type, target_id);
```

