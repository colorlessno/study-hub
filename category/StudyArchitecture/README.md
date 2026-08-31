# StudyArchitecture

ソフトウェアアーキテクチャ・設計レビューの考え方を、独立した小規模システムを実際に動かして学ぶための個人学習用プロジェクトです。各テーマに画面、HTTP API、SQLite、実行ログ、ヘルス確認と設計文書を揃えています。

## 取り扱うテーマ

| 番号 | テーマ | 学習入口 | 最初の成果物 |
|------|--------|---|---|
| arch01 | システム構造のウォークスルー（system anatomy walkthrough） | [学習ノート](./doc/learning_notes/arch01_system_anatomy_walkthrough/README.md) | 画面・API・SQLite・ログを通る処理の追跡 |
| arch02 | 証跡ベースの設計レビュー（evidence-driven design review） | [学習ノート](./doc/learning_notes/arch02_evidence_driven_design_review/README.md) | 実行証拠、finding、残リスクの保存 |

## 最初に取り組むこと

リポジトリルートで教材構造を確認し、`arch01`または`arch02`を単体で起動します。

```bat
rtk node category\StudyArchitecture\scripts\validate-architecture-learning.mjs
rtk node category\StudyArchitecture\src\apps\arch01_system_anatomy_walkthrough\app\server.js
rtk node category\StudyArchitecture\src\apps\arch02_evidence_driven_design_review\app\server.js
```

- arch01は`http://127.0.0.1:43701/`、arch02は`http://127.0.0.1:43702/`で開く。
- 各テーマは別ポート、別SQLiteファイル、別ソースで動作する。
- リポジトリで確認した事実と、設計意図に関する推測を混ぜない。

## 構成

```text
category/StudyArchitecture/
  doc/
    requirements/      要件定義
    basic_design/      基本設計
    detailed_design/   詳細設計
    learning_notes/    学習ノート
  src/apps/
    arch01_system_anatomy_walkthrough/       arch01専用システム
    arch02_evidence_driven_design_review/    arch02専用システム
  scripts/             文書構造の自動検証
```

## 本リポジトリについて

- 個人の学習用に作成している実験的なプロジェクトです。
- 開発・整理には Claude Code / Codex などの AI コーディングアシストを活用しています。
- 学習目的のため、各テーマの粒度や完成度には差があります。

## テーマの独立性

`arch01`と`arch02`は、それぞれ単体で元の学習要件を満たす実行環境です。他のStudyテーマを起動対象や保存先として使用しません。文書は実行結果を読み解くために使い、画面操作、HTTP通信、SQLite保存、ログ取得を実際に行います。
