# devops04 詳細設計

## Playwright E2E

## 1. 実装配置

```text
category/StudyDevOps/src/apps/devops04_playwright_e2e/
  package.json
  package-lock.json
  app/src/
  tests/e2e/form.spec.ts
  playwright.config.ts
  Dockerfile
```

## 2. 画面設計

| 要素 | test id | 内容 |
|---|---|---|
| name input | `name-input` | 名前を入力 |
| submit button | `submit-button` | 送信 |
| result | `result-message` | 結果表示 |

## 3. E2E test case

| case | 手順 | 期待 |
|---|---|---|
| form submit | open -> input -> click | result に入力値が表示される |
| empty validation | open -> click | validation message が表示される |

## 4. Playwright設定

```text
webServer: npm run dev
fullyParallel: false
workers: 1
use.trace: retain-on-failure
use.screenshot: only-on-failure
```

## 5. Docker設計

- Playwright 公式 image を利用する。
- browser dependency をコンテナ内に含める。
- CI では `playwright-report` と `test-results` を artifact にする。

## 6. 検証コマンド

```powershell
npm.cmd --prefix category/StudyDevOps/src/apps/devops04_playwright_e2e ci
npm.cmd --prefix category/StudyDevOps/src/apps/devops04_playwright_e2e exec -- playwright install chromium
npm.cmd --prefix category/StudyDevOps/src/apps/devops04_playwright_e2e run test:e2e
docker build -t studydevops-devops04 category/StudyDevOps/src/apps/devops04_playwright_e2e
```

## 7. 安全性

- secrets は画面、trace、screenshot に出さない。
- 外部APIは呼ばない。
- テキストファイルは UTF-8 BOMなしで保存する。
