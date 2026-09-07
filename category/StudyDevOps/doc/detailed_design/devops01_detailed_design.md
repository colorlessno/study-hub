# devops01 詳細設計

## GitHub Actions build

## 1. 実装配置

```text
category/StudyDevOps/src/apps/devops01_github_actions_build/
  app/package.json
  app/package-lock.json
  app/src/index.js
  Dockerfile
.github/workflows/studydevops-ci.yml
```

## 2. workflow設計

`studydevops-ci.yml`の`node-quality` job:

```yaml
jobs:
  node-quality:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: "22"
      - run: npm ci
        working-directory: category/StudyDevOps/src/apps/devops01_github_actions_build/app
      - run: npm run build
        working-directory: category/StudyDevOps/src/apps/devops01_github_actions_build/app
```

## 3. package scripts

| script | コマンド | 目的 |
|---|---|---|
| `build` | `node src/index.js` | CI build の最小代替 |
| `check` | `npm run build` | ローカルとCIの共通入口 |

## 4. Docker設計

```dockerfile
FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32
WORKDIR /app
COPY app/package*.json ./
RUN npm ci
COPY app ./
CMD ["npm", "run", "build"]
```

## 5. 検証コマンド

```powershell
npm.cmd --prefix category/StudyDevOps/src/apps/devops01_github_actions_build/app run build
docker build -t studydevops-devops01 category/StudyDevOps/src/apps/devops01_github_actions_build
docker run --rm studydevops-devops01
```

## 6. エラー確認観点

| 失敗箇所 | 見るログ |
|---|---|
| checkout | repository / path |
| setup-node | Node.js version |
| npm ci | lockfile / dependency |
| build | script / compile output |

## 7. 安全性

- secrets は使わない。
- workflow に token、password、個人情報を記載しない。
- テキストファイルは UTF-8 BOMなしで保存する。
