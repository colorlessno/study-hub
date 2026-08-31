# System 19 基本設計

## Attentionデモ

## 1. 設計目的

文章内の単語同士の関係を疑似スコアで可視化し、Attentionを業務利用者へ説明するための観察画面をStudyAIの共通学習基盤へ組み込む。入力、API、処理、表示、保存、Docker実行の境界を定義する。

## 2. 配置

```text
category/StudyAI/
  src/backend/src/studyai/
    common/config/settings.py
    systems/ai_learning/
      catalog.py
      router.py
      service.py
  src/frontend/src/pages/SystemLearningPage.tsx
  src/scripts/system19_demo.py
  src/backend/tests/systems/test_ai_learning_systems.py
  data/ai_learning/system19_runs.json
```

- `system17`から`system36`の小さな学習実験は共通の`ai_learning` APIとサービスを使う。
- system19固有の既定入力、題名、観察内容は`catalog.py`へ定義する。
- system19は外部AI APIを使わず、サーバー側の決定的な疑似計算を使用する。
- フロントエンドは共通`SystemLearningPage`でsystem19専用の入力補助と行列表示を切り替える。

## 3. 全体構成

```text
利用者
  ↓ SystemLearningPage
  ↓ /api/system19/metadata・execute・runs
  ↓ ai_learning router
  ↓ LearningSystemService
  ↓ 簡易分割・疑似関係値計算
  ↓ system19_runs.jsonへ保存
```

## 4. コンポーネント

| コンポーネント | 役割 |
|---|---|
| `ai_learning router` | メタデータ、実行、履歴APIを提供する |
| `LearningSystemService` | 分割、疑似関係行列、注目位置補正、加算理由、履歴保存と読戻しを行う |
| `Settings` | system19履歴JSONのパスを保持する |
| `SystemLearningPage` | JSON入力、分割単語、関係行列、保存状態、履歴を表示する |
| `system19_demo.py` | 共通サービスを使うCLI実行口を提供する |

## 5. 入出力

| 区分 | 内容 |
|---|---|
| 入力 | `sentence`, `focus_token_index` |
| 処理 | 文章を分割し、位置・同一語・指示語・修飾語から単語間の疑似関係値を一組ずつ計算する |
| 出力 | `tokens`, `attention_matrix`, `focus_token_index`, `focus_relations`, `relation_reasons`, `score_note` |
| 保存 | 入力と結果を`system19_runs.json`へ新しい順で直近20件保存する |

## 6. API

| メソッド | パス | 目的 |
|---|---|---|
| GET | `/api/system19/metadata` | 既定入力と画面表示情報を返す |
| POST | `/api/system19/execute` | 入力をサーバーで処理し、保存済み結果を返す |
| GET | `/api/system19/runs` | 保存済みの直近20件を返す |

- 空の文章はHTTP 400で拒否する。
- 注目位置が範囲外なら有効範囲へ補正する。
- 画面はAPIと通信し、ブラウザ内だけで疑似行列を生成しない。

## 7. 画面

| 領域 | 内容 |
|---|---|
| 入力 | 文章と注目位置をJSONで編集する |
| 結果 | 分割単語、補正後の注目位置、保存状態を表示する |
| 関係行列 | 行と列を分割単語へ対応させて疑似関係値を表示する |
| 履歴 | 保存済み結果を選択して再表示する |

## 8. データ保存

| データ | 主な項目 |
|---|---|
| 実行履歴 | `run_id`, `system_id`, `input`, `result`, `observation`, `created_at` |

- 保存先は`data/ai_learning/system19_runs.json`とする。
- UTF-8で直近20件を保存し、起動時に読み戻す。
- Dockerではホスト側の`src/backend/data`をマウントして再作成後も保持する。
- 個人情報や機密情報を入力する場合は保存前のマスク方針を別途定義する。

## 9. Docker・ローカル実行

- 既存の`docker-compose.yml`のbackendとfrontendを使用する。
- system19はLM Studioを必須としない。
- 対象試験、CLI、API、実ブラウザの順に一つずつ確認する。
- 作成・更新するテキストファイルは既存のBOMと改行を維持したUTF-8とする。

## 10. 後続工程

- 疑似スコアの計算規則と制約
- request / responseの項目
- JSON保存と読戻し
- 入力エラー
- Docker試験と実画面確認
- 実際のTransformer Attentionとの差の明示
