# devops04 要件定義

## Playwright E2E

## 1. 目的

ブラウザ操作を自動化し、画面表示、入力、クリック、API 連携を E2E で確認する方法を学ぶ。

## 2. 学習対象

- Playwright の基本操作
- page navigation、locator、form input、assertion
- screenshot / trace の確認
- Docker または CI 上での browser test
- flaky test の切り分け方

## 3. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | 最小 Web 画面を用意する |
| FR-02 | 入力フォームと結果表示を用意する |
| FR-03 | Playwright で画面遷移と入力操作を確認する |
| FR-04 | 失敗時 screenshot または trace を保存する設定例を用意する |
| FR-05 | Docker または CI で headless 実行できる方針を記載する |

## 4. 非機能要件

- test は画面文言の過剰依存を避け、安定した locator を使う。
- 外部サービス接続を不要にする。
- 作成するテキストファイルは UTF-8 BOMなしとする。

## 5. 対象外

- 全ブラウザ網羅
- visual regression test の本格導入
- 実ユーザー監視

## 6. 成果物

```text
category/StudyDevOps/
  src/apps/devops04_playwright_e2e/
    app/
    tests/e2e/
    playwright.config.ts
    Dockerfile
  doc/learning_notes/devops04_playwright_e2e/
    README.md
  doc/requirements/devops04_playwright_e2e_requirements.md
```

## 7. 受入条件

- 画面を起動し、Playwright で入力から結果表示まで確認できる。
- 失敗時に screenshot または trace の場所を確認できる。
- CI / Docker 実行時の前提を説明できる。
