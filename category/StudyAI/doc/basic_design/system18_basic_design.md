# System 18 基本設計

## Embedding類似検索ミニ実験

---

## 1. 設計目的

Embedding類似検索ミニ実験は、要件定義で定めた「検索比較」の学習を、StudyAI の共通アプリ構造に組み込める単位へ整理する。本設計では、入力、処理・結果、出力、保存、画面、API、Docker実行方針を定義し、詳細設計と製造へ引き継ぐ。

## 2. 配置方針

```text
category/StudyAI/
  src/backend/src/studyai/
    common/ai/embedding_client.py
    systems/ai_learning/
      catalog.py
      router.py
      service.py
  src/frontend/src/pages/SystemLearningPage.tsx
  src/scripts/system18_demo.py
  src/backend/tests/systems/test_ai_learning_systems.py
  doc/basic_design/system18_basic_design.md
```

- system17からsystem36は共通の`ai_learning`実装を使い、system18の入力例と表示名は`catalog.py`に定義する。
- Embedding APIとの通信は共通の`EmbeddingClient`を利用する。
- system18の処理は`LearningSystemService`のAPI用実行入口から呼び出し、検索文と候補文書を一件ずつ順番に処理する。
- 画面は共通の`SystemLearningPage`を使い、system18では保存結果と類似検索結果を専用表示する。

## 3. 全体構成

```text
利用者
  ↓ SystemLearningPage
  ↓ POST /api/system18/execute
  ↓ ai_learning router
  ↓ LearningSystemService
  ↓ EmbeddingClient
  ↓ LM Studio /v1/embeddings
  ↓ cosine類似度計算
  ↓ JSONファイルの実行履歴へ保存
```

## 4. コンポーネント設計

| コンポーネント | 役割 |
|---|---|
| `ai_learning router` | system18のメタデータ取得、実行、履歴取得のAPI入口を提供する |
| `LearningSystemService` | 入力検証、Embedding取得、cosine類似度計算、順位付け、実行履歴保存を行う |
| `EmbeddingClient` | 設定されたOpenAI互換の`/embeddings`へ文章を送信する |
| `SystemLearningPage` | 入力例、JSON入力、使用モデル、ベクトル次元、保存件数、検索結果を表示する |
| `system18_demo.py` | 共通サービスを使うCLI実行口を提供する |

## 5. 入出力設計

| 区分 | 内容 |
|---|---|
| 入力 | `query`, `documents`, `top_k` |
| 処理 | 検索文を送信した後、候補文書を配列順に一件ずつEmbedding APIへ送り、同一次元のベクトル同士でcosine類似度を計算する |
| 出力 | 使用モデル、ベクトル次元、保存件数、順位、文書番号、根拠文、cosine類似度 |
| 保存 | JSONファイルに入力、Embeddingベクトル、検索結果を含む最新20件の実行履歴を保存する |

## 6. API設計

| メソッド | パス | 目的 | 備考 |
|---|---|---|---|
| GET | `/api/system18/metadata` | 表示名、初期入力、入力例を取得する | 共通の学習画面が使用する |
| POST | `/api/system18/execute` | 文書登録、Embedding取得、類似検索、履歴保存を一度に実行する | `input`に`query`、`documents`、`top_k`を指定する |
| GET | `/api/system18/runs` | 保存された最新20件の実行履歴を取得する | StudyAI再起動後も読み戻す |

- API prefix は `/api/system18` とする。
- 通常実行はLM StudioのEmbedding APIと実際に通信する。テスト時だけ同じインターフェースの固定ベクトルを使用する。
- 入力不正は400、Embedding APIの失敗は共通の外部サービスエラーとして返す。

## 7. 画面設計

| 領域 | 内容 |
|---|---|
| 入力領域 | 入力例を選び、`query`、`documents`、`top_k`をJSONで編集する |
| 実行領域 | 実行ボタン、設定値、実行状態を表示する |
| 保存結果領域 | 使用モデル、ベクトル次元、保存件数、保存状態を表示する |
| 結果領域 | 順位、文書番号、根拠文、cosine類似度を表で表示する |

## 8. データ設計

| データ | 主な項目 |
|---|---|
| 実行履歴 | `run_id`, `system_id`, `input`, `result`, `observation`, `created_at` |
| `result.query_embedding` | 検索文のEmbeddingベクトル |
| `result.vector_storage` | `document_id`, `text`, `embedding`, `dimension` |
| `result.results` | `rank`, `document_id`, `evidence_text`, `score` |

- `data/ai_learning/system18_runs.json`へ最新20件をUTF-8で保存する。
- 保存時は一時ファイルへ書き込んでから置き換え、途中書込みのJSONを残さない。
- StudyAI起動時に保存済み履歴を読み戻し、画面とAPIの出力形式を維持する。
- 個人情報・機密情報を扱う可能性がある入力の保存前にマスク方針を確認する。

## 9. Docker・ローカル実行方針

- StudyAI 既存の `docker-compose.yml` に統合できる構造を優先する。
- 小さいCLI検証だけで完結する場合も、製造工程で Docker 実行口を検討する。
- Docker build / run を実施しない場合は、検証記録に未実行理由を残す。
- 作成・更新するテストファイルは UTF-8 BOMなしで保存する。

## 10. 後続工程への引き継ぎ

詳細設計では、次を具体化する。

- request / response schema
- 保存形式またはテーブル定義
- モックAIと実AIを切り替える設定
- エラーコード
- Docker 実行方針
- 検証コマンド
