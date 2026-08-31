# StudyDesktop

デスクトップアプリ（Electron）とローカル環境の自動化を学ぶための個人学習用プロジェクトです。テーマごとに要件定義・設計文書と実装を揃えています。

## 取り扱うテーマ

| 番号 | テーマ | 学習入口 | 実装 |
|------|--------|----------|------|
| desktop01 | Electron によるローカル環境構築の自動化 | [`学習ノート`](doc/learning_notes/desktop01_electron_local_environment_automation/README.md) | [`Electron MVP`](src/apps/desktop01_electron_local_environment_automation/README.md) |

## 最初に取り組むこと

1. `desktop01` の学習ノートで main / preload / renderer の境界を確認する。
2. GUIを起動せず、安全なtask一覧・mock処理・cleanup境界を検証する。

```cmd
cd category/StudyDesktop\src\apps\desktop01_electron_local_environment_automation
npm run verify
```

3. デスクトップ画面を使える環境ではElectron UIから同じtaskを実行する。

```cmd
npm ci
npm run start
```

GUIを使えないCI、SSH、WSLなどでは `npm run verify` まででコード側の学習を続けられる。

## 実行環境

| 確認内容 | 必要なもの |
|----------|------------|
| GUIなし検証 | Node.js 20以上、npm。依存パッケージのインストールは不要 |
| Electron UI | Node.js、npm、`npm ci`、デスクトップ画面を表示できるOSセッション |
| headless環境 | `npm run verify` を使用し、Electron UIの起動確認はデスクトップ環境で行う |

## 構成

```text
category/StudyDesktop/
  src/apps/            各テーマの単体実装
  doc/
    requirements/      要件定義
    basic_design/      基本設計
    detailed_design/   詳細設計
    learning_notes/    学習ノート
```

## 本リポジトリについて

- 個人の学習用に作成している実験的なプロジェクトです。
- 開発・整理には Claude Code / Codex などの AI コーディングアシストを活用しています。
- 学習目的のため、各テーマの粒度や完成度には差があります。
