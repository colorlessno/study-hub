# devops04 基本設計

## Playwright E2E

## 1. 設計目的

画面の入力、クリック、結果表示を Playwright で確認し、ブラウザ操作の自動化と失敗時 artifact の見方を学べる教材にする。

## 2. 配置方針

```text
category/StudyDevOps/
  src/apps/devops04_playwright_e2e/
    app/
      src/
    tests/e2e/
      form.spec.ts
    playwright.config.ts
    Dockerfile
  doc/learning_notes/devops04_playwright_e2e/
    README.md
```

- locator は安定した `data-testid` を使う。
- screenshot / trace は失敗時に保存する。
- 作成・更新するテキストファイルは UTF-8 BOMなしとする。

## 3. 全体フロー

```text
web app start -> browser launch -> navigate -> input -> submit -> assert -> artifact review
```

## 4. コンポーネント

| コンポーネント | 役割 |
|---|---|
| `app/` | E2E 対象の小さい Web 画面 |
| `tests/e2e/form.spec.ts` | 入力から結果表示まで確認する |
| `playwright.config.ts` | web server、trace、screenshot を設定する |
| `Dockerfile` | headless browser test を実行する |

## 5. Docker / CI 方針

- Playwright 公式 image または browser dependency を含む image を使う。
- CI では artifact を保存できる設定を想定する。
- 外部APIに依存しない。
- secrets は使わず、trace も screenshot に秘密情報が残らない画面にする。

## 6. 後続工程への引き継ぎ

詳細設計では、画面項目、locator、assertion、artifact path、Docker/CIコマンドを定義する。
