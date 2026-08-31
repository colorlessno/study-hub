# StudyAI

AI システム開発を、**要件定義 → 基本設計 → 詳細設計 → 製造 → 検証**という一連の工程（SDLC）で実践しながら学ぶための、個人学習用プロジェクトです。複数の業務想定システム（`system01` 〜）を題材に、各工程の成果物（設計文書とコード）を揃えています。

## 学習の入口

- [リポジトリ全体の学習再開ガイド](../../LEARNING_GUIDE.md)
- [全テーマカタログ](../../THEME_CATALOG.md)
- [StudyAI 学習ノート一覧](./doc/learning_notes/README.md)
- [system03 RAG Q&A 学習ハブ](./doc/learning_notes/system03_project_document_qa/README.md)
- [AIシステム開発 学習ロードマップ](./doc/requirements/index.md)

## 推奨学習経路

48テーマを番号順に一括学習せず、目的別の経路として往復します。同じテーマが複数経路の前提になる場合は重複して参照します。

| 経路 | 対象 | 到達する問い |
|---|---|---|
| AI基礎・評価 | system17、19〜21、24〜28、31、34〜36、44 | 入出力、model設定、評価、traceをどの証拠から判断するか |
| RAG・検索品質 | system18、22〜23、29〜30、32〜33、03 | 文書をどう分割・検索・評価し、根拠付き回答へつなぐか |
| 業務AI | system01〜02、04〜07、14〜16、37〜43、47 | AIの役割と業務ロジック、read-only境界、人間判断をどう分けるか |
| Agent実装・運用 | system08〜13、45〜46、48 | tool、状態、停止条件、承認、引き継ぎをどう設計するか |

最初は外部LLM・DB・networkを使わない`system17〜22`から始めます。共通ハーネスは概念観察用の決定的シミュレーションであり、実modelのtokenizer、embedding、attention、生成結果そのものではありません。

## 最初に取り組むこと

Python 3.11以上を使用し、リポジトリルートで次を実行します。外部package、API key、DBは不要です。

```powershell
python category/StudyAI\scripts\validate-ai-learning.py system17 --show-output
python category/StudyAI\scripts\validate-system03-rag-learning.py --show-output
```

1つ目は共通ハーネスの概念観察、2つ目はsystem03実装と同じChunk生成・検索スコアmoduleの確認です。出力を読み、実modelで確認した事実とローカル計算による観察を混同していないか説明します。Python環境を用意していない場合は、既存の`backend-test` Docker Compose serviceを使う発展手順へ進みます。

## 本リポジトリについて

- 個人の学習用に開発している実験的なプロジェクトです。各システムを通じて、AI を組み込んだ Web システムの設計・実装の流れを体験・記録することを目的にしています。
- 開発には **Claude Code / Codex などの AI コーディングアシストを活用**しています。
- 各システムの完成度には差があり、要件・設計までのもの、製造（実装）まで到達しているものが混在します。

## 構成

```text
category/StudyAI/
  src/backend/      FastAPI バックエンド（systems/system01〜, enterprise_ai, ai_learning）
  src/frontend/     React + Vite フロントエンド
  src/scripts/      スモークテスト・補助スクリプト
  doc/
    requirements/      各システムの要件定義
    basic_design/      基本設計
    detailed_design/   詳細設計
    learning_notes/    学習ノート
    ai_system_dev_knowledge_map.md   工程別の知識マップ（横断）
  docker/ , docker-compose.yml        実行環境
```

各システムは「要件定義 → 基本設計 → 詳細設計 → 製造」を一通り辿れるよう、`doc/` に工程別の成果物を、`src/` に実装を配置しています。

### System17〜44 の実装形態について

System01〜16 は `src/backend/src/studyai/systems/systemXX/` に個別実装がありますが、
**System17〜36（LLM基礎実験系）と System37〜44（業務AI系）は、それぞれ `systems/ai_learning/`・`systems/enterprise_ai/` の共通ハーネス（catalog + service + router）による実装です。**
各テーマの入力・処理・観察ポイントをカタログとして定義し、共通サービスが決定的シミュレーション（LLM 非使用）として実行します。フロントエンドには全システムのページがあり、Execute で実際に動作します。個別フォルダが無いのは意図した設計です。工程横断の知識整理は [doc/ai_system_dev_knowledge_map.md](doc/ai_system_dev_knowledge_map.md) にまとめています。

## 技術スタック

| 領域 | 使用技術 |
|------|----------|
| バックエンド | Python / FastAPI / Uvicorn / SQLAlchemy(async) / Alembic / pydantic-settings |
| AI エージェント | LangGraph、OpenAI 互換 API（ローカル LM Studio 等を想定） |
| フロントエンド | TypeScript / React / React Router / axios / Vite |
| データベース | PostgreSQL（pgvector 拡張でベクトル検索） |
| 実行環境 | Docker / docker-compose |
| テスト | pytest / pytest-asyncio |

## セットアップ

```bash
docker compose up -d
```

- `db`（PostgreSQL + pgvector）→ `migrate`（Alembic マイグレーション）→ `backend` の順に起動します。
- バックエンド単体やフロントエンドの起動方法は各 `src/backend` / `src/frontend` を参照してください。
- AI を使うシステムは、OpenAI 互換のローカル LLM サーバ（LM Studio 等）を前提とします。
- **重要: 自然言語検索・Q&A（RAG）を使うシステム（System03 など）は、会話用 LLM に加えて Embedding モデルが必須です。**
  Embedding モデルは文章を意味ベクトルに変換し、「質問と意味が近い文書を探す」検索部分を担います（会話用 LLM とは別物）。
  LM Studio では会話用モデルと併せて `nomic-embed-text` 等の Embedding モデルもロードしてください。
  未ロードの場合、質問時に `embedding_request_failed`（502）になります。モデル名は `.env.docker` の `EMBEDDING_MODEL` で指定します。

> **データベース接続情報について**: `docker-compose.yml` や設定の既定値に含まれる `postgres / postgres` は、**ローカル開発用の慣例的なデフォルト**です。本番等で利用する場合は `DATABASE_URL` 等の環境変数で上書きしてください。

## テスト

外部依存なしのAI基礎・評価ハーネスは、リポジトリルートから個別または全件を検証できます。

```bash
python category/StudyAI/scripts/validate-ai-learning.py system18
python category/StudyAI/scripts/validate-ai-learning.py
python category/StudyAI/scripts/validate-system03-rag-learning.py
```

FastAPI統合を含む既存テストはバックエンド環境で実行します。

```bash
cd src/backend
pytest
```

## 補足

- このリポジトリには、サイズの大きいデータや実行時生成物、`.env`（`.env.example` を除く）等を `.gitignore` で除外しています。
- 学習目的のため、設計文書とコードの粒度や完成度はシステムごとに異なります。
- 外部APIを使う補助教材として[音声生成sample](./src/samples/audio_generation/)があります。番号テーマとは分けて扱います。
