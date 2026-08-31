# devops01 要件定義

## GitHub Actions build

## 1. 目的

GitHub Actions で push / pull request 時に build を実行し、AI が生成した Web/API 実装を人手だけに頼らず継続確認できる土台を学ぶ。

## 2. 学習対象

- GitHub Actions workflow の基本構造
- checkout、runtime setup、dependency install、build command
- 成功 / 失敗ログの読み方
- ローカル build と CI build の差分
- Docker に入れられる build 検証の扱い

## 3. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | リポジトリ共通の`.github/workflows/studydevops-ci.yml`にbuild jobを作成する |
| FR-02 | Node.js または Python の最小 build job を定義する |
| FR-03 | build 成功時と失敗時のログ確認ポイントを README に記載する |
| FR-04 | ローカルで同等コマンドを実行できる手順を用意する |
| FR-05 | Docker build で再現できる場合の Dockerfile または compose 例を用意する |

## 4. 非機能要件

- 実際の GitHub repository へ push しなくても、workflow の読み方とローカル代替確認が学べること。
- secrets は使わない。必要な場合はダミー名のみ記載し、値は保存しない。
- 作成するテキストファイルは UTF-8 BOMなしとする。

## 5. 対象外

- 本番デプロイ
- 有料 GitHub Actions runner の利用
- organization policy や branch protection の本格設計

## 6. 成果物

```text
category/StudyDevOps/
  src/apps/devops01_github_actions_build/
    app/
    Dockerfile
  doc/learning_notes/devops01_github_actions_build/
    README.md
    workflow_overview.md
  doc/requirements/devops01_github_actions_build_requirements.md
.github/workflows/studydevops-ci.yml
```

## 7. 受入条件

- workflow の各 step の目的が説明できる。
- ローカル build コマンドと CI build コマンドの対応が分かる。
- build 失敗時に、dependency install、compile、test のどこで失敗したか分析・分類できる。
