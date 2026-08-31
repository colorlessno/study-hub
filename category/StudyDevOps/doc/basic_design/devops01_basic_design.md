# devops01 基本設計

## GitHub Actions build

## 1. 設計目的

GitHub Actions の build workflow を教材化し、ローカル build と CI build の対応、失敗ログの読み方、Docker による再現方法を学べる構成にする。

## 2. 配置方針

```text
category/StudyDevOps/
  src/apps/devops01_github_actions_build/
    app/
      package.json
      package-lock.json
      src/
    Dockerfile
  doc/learning_notes/devops01_github_actions_build/
    README.md
    workflow_overview.md
.github/workflows/studydevops-ci.yml
```

- 実際の GitHub repository への push は必須にしない。
- workflow は教材として読める内容にし、ローカル代替コマンドを README に記載する。
- 作成・更新するテキストファイルは UTF-8 BOMなしとする。

## 3. 全体フロー

```text
source checkout -> runtime setup -> dependency install -> build -> result log review
```

## 4. コンポーネント

| コンポーネント | 役割 |
|---|---|
| `studydevops-ci.yml` | GitHub Actions のStudyDevOps用jobを定義する |
| `app/package.json` | build script を持つ最小の Node.js アプリ |
| `Dockerfile` | CI と同等の build をローカル Docker で再現する |
| `doc/learning_notes/.../README.md` | CIログの見方、失敗時の対処方法を説明する |

## 5. Docker / CI 方針

- Docker build で dependency install と build を再現する。
- GitHub Actions では Node.js setup、`npm ci`、`npm run build` を分ける。
- secrets は使わない。

## 6. 後続工程への引き継ぎ

詳細設計では、workflow yaml、package scripts、Dockerfile、失敗ケース、検証コマンドを具体化する。
