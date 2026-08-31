# StudyHub 学習・開発ポートフォリオ

AIコーディング支援を活用して作成したソースを、実際に読み、動かし、変更し、自分の知識へ変えていくための学習ポートフォリオです。13分野・167テーマ（番号付き163件、単独教材4件）を通して、ソフトウェア開発を「要件定義 → 基本設計 → 詳細設計 → 製造 → 検証」の一連の工程（SDLC）で扱っています。

## 2つの入口

| 目的 | 最初に見る場所 |
|---|---|
| 成果物や技術力を短時間で確認する | 下の「代表成果」と「プロジェクト一覧」 |
| 学習を再開し、手を動かす | [学習再開ガイド](./LEARNING_GUIDE.md) → [テーマカタログ](./THEME_CATALOG.md) |

学習記録を残す場合は [学習ログテンプレート](./LEARNING_LOG_TEMPLATE.md) を使います。

## StudyHubを起動する

Node.jsとnpmを用意し、リポジトリのルートから次のコマンドを順番に実行します。

```text
cd app
npm ci
npm run build
npm start
```

起動後は `http://127.0.0.1:3100/fields?catalog=actual` を開きます。Docker Desktop、LM Studio、Electronなどが必要かどうかはテーマごとに異なり、StudyHubが外部環境を自動起動することはありません。開発用の起動方法は下の「StudyHubアプリの開発と検証」を参照してください。

## 代表成果

### StudyAI system03: プロジェクト文書の自然言語Q&A

文書登録、チャンキング、Embedding、ハイブリッド検索、根拠付き回答、フィードバック記録を扱うRAGシステムです。要件、設計、FastAPI実装、React画面、pytestを横断できます。

- [学習ハブ](./category/StudyAI/doc/learning_notes/system03_project_document_qa/README.md)
- [要件定義](./category/StudyAI/doc/requirements/system03_requirements.md)
- [バックエンド実装](./category/StudyAI/src/backend/src/studyai/systems/system03/)
- [テスト](./category/StudyAI/src/backend/tests/systems/system03/test_chunk_service.py)

### StudyIdeaForge / IdeaForge

発想法をグラフとして組み立て、AIの生成結果を人間が採用・修正・再生成しながら案を育てるローカルWebアプリです。

- [プロジェクト概要](./category/StudyIdeaForge/)
- [アプリケーション](./category/StudyIdeaForge/ideaforge/)
- [最初に取り組むこと](./category/StudyIdeaForge/ideaforge/README.md#最初に取り組むこと)

### 小さく学べる教材

- [web01: HTML / CSS / JavaScriptの役割分担](./category/StudyWeb/doc/learning_notes/web01_static_first_page/README.md)
- [security01: Cookie + Session認証](./category/StudySecurity/doc/learning_notes/security01_session_auth/README.md)

## 学習方針

完成したコードを読むだけでなく、次のサイクルで理解を確認します。

```text
思い出す → 動かす → コードをたどる → 壊して直す → 自分の言葉で説明する
```

到達度は「再現できる」「説明できる」「改造できる」「応用できる」で記録します。詳しい進め方は [学習再開ガイド](./LEARNING_GUIDE.md) にまとめています。

各`StudyXX`は独立して利用でき、[分野カタログ](./catalog/)に検証方法と実行上の種別をまとめています。ルートの[StudyHubアプリ](./app/)からも分野とテーマを選び、対応済みの教材を表示・起動できます。StudyHubを使わずに各教材を直接動かすこともできます。

## プロジェクト一覧

### 実装まで一周した主要プロジェクト

| プロジェクト | 内容 | 主な技術 |
|---|---|---|
| [StudyAI](./category/StudyAI/) | AIを組み込んだ業務システム群（system01〜48）。データ抽出、RAG、エージェント等 | Python / FastAPI / PostgreSQL (pgvector) / LangGraph / React / Docker |
| [StudyWeb](./category/StudyWeb/) | Web開発の体系学習（web01〜52）。静的ページからNext.js、Prisma、Compose構成まで | TypeScript / React / Next.js / NestJS / Prisma / Docker |
| [StudySecurity](./category/StudySecurity/) | セキュリティ実装教材（security01〜21）。認証、認可、Web攻撃対策、AI安全 | Node.js（依存ゼロ実装） |
| [StudyDevOps](./category/StudyDevOps/) | CI/CD、テスト、ログ、運用、障害対応の教材 | GitHub Actions / Playwright / Docker |
| [StudyAWS](./category/StudyAWS/) | AWSの主要概念をローカルで模擬する教材（aws01〜10） | Node.js / Docker |
| [StudyIdeaForge](./category/StudyIdeaForge/) | IdeaForge — AIと人間の協働による発想支援Webアプリ | FastAPI / SQLite / React / Vite |

### 学習ノート・設計中心のプロジェクト

| プロジェクト | 内容 |
|---|---|
| [StudyDB](./category/StudyDB/) | データベース教材（SQL実習と設計文書） |
| [StudyBase](./category/StudyBase/) | 開発の基礎作法（ヒアリング、見積、Git、npm等） |
| [StudyArchitecture](./category/StudyArchitecture/) | アーキテクチャ分析・設計レビューの文書教材 |
| [StudyDesktop](./category/StudyDesktop/) | Electronによるデスクトップアプリ教材 |
| [StudyAIIdeaGeneration](./category/StudyAIIdeaGeneration/) | AI発想支援のプロンプト集 |
| [StudyAICorporateEmployee](./category/StudyAICorporateEmployee/) | ローカルPC上に役割別「AI社員」を構築する設計メモ |
| [StudyAPI](./category/StudyAPI/) | Python標準ライブラリによる最小Web APIとmock upstreamの教材 |

## リポジトリ構成

各プロジェクトでは、工程別の文書と実装を対応付けています。

```text
study-hub repository
├─ app/                   StudyHub本体
├─ sample-data/           画面動作確認用の疑似教材
├─ category/
│  └─ StudyXX/            独立利用できる教材・実装
├─ catalog/               分野のmetadataと検証契約
└─ scripts/               構造検証・起動支援
```

各`StudyXX`は必要に応じて`doc/requirements/`、`doc/basic_design/`、`doc/detailed_design/`、`doc/learning_notes/`、`src/`を持ちます。一部のテーマは、コードではなくチェックリスト、設計レビュー、運用手順などを成果物とする「文書完結型」です。

## StudyHubアプリの開発と検証

StudyHubは、リポジトリ内の学習教材を分野とテーマから選び、実際に表示・起動・操作するローカル学習アプリです。疑似テーマ11件と実テーマ167件を切り替え、文書、静的Web、Node.js API、コマンド、Docker、共有実行環境、Electronアプリを扱えます。

開発時はリポジトリのルートから次のコマンドを順番に実行します。

```text
cd app
npm ci
npm run dev
```

- 開発画面: `http://127.0.0.1:3000/`
- ローカルAPI: `http://127.0.0.1:3100/`

ビルドとテストは`app`で次の順に実行します。

```text
npm run build
npm test
```

実教材を追加・変更した場合は、リポジトリのルートで`node scripts/generate-theme-catalog.mjs`を実行します。生成結果だけを確認する場合は`node scripts/generate-theme-catalog.mjs --check`を使用します。

StudyHubはカタログに登録された処理だけを起動し、任意のコマンド入力は受け付けません。子プロセスはシェルを介さずに実行し、サーバーは`127.0.0.1`だけで待ち受けます。依存パッケージ、Docker Desktop、LM Studio等の外部環境は自動導入・起動しません。別アプリがLM Studioを利用している場合は、StudyHubの確認のために停止、再起動、モデル変更を行わず、共有サービスとして扱います。

Electron教材を初めて動かす場合は、`category/StudyDesktop/src/apps/desktop01_electron_local_environment_automation/`で`npm ci`、`npm run setup:electron`の順に実行します。

## AIコーディング支援について

- Claude CodeやCodexなどを、初期実装、調査、レビュー、修正支援に利用しています。
- AIが生成した内容をそのまま理解済みとは扱わず、実行、差分確認、テスト、説明、改造を通して検証します。
- 実行していない内容を検証済みとして記録しない方針です。

## 検証

ルートから次のコマンドを実行すると、公開文書のリンク、テキストファイルのUTF-8、学習カタログのテーマ数を確認できます。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate_portfolio.ps1
node scripts/validate-study-catalog.mjs
node scripts/run-study-check.mjs --list
```

PowerShell 7 (`pwsh`) を使用する場合は、`pwsh -File scripts/validate_portfolio.ps1` でも実行できます。

`docker-compose.yml` 等に含まれる `postgres / postgres` などの接続情報は、ローカル学習用の慣例的なデフォルト値です。環境変数（`POSTGRES_PASSWORD` / `DATABASE_URL` 等）で上書きできます。本番用途では必ず変更してください。
