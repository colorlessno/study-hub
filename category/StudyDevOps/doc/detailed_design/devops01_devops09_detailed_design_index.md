# StudyDevOps devops01-devops09 詳細設計インデックス

## 目的

StudyDevOps の各教材を、製造工程でそのまま実装できる設定ファイル、script、test、Docker/CI、検証コマンドの粒度へ落とす。

## 一覧

| No | 詳細設計 | 主な具体化 |
|---|---|---|
| devops01 | `devops01_detailed_design.md` | GitHub Actions workflow、Docker build |
| devops02 | `devops02_detailed_design.md` | lint、unit test、package scripts |
| devops03 | `devops03_detailed_design.md` | API endpoint、HTTP test、compose |
| devops04 | `devops04_detailed_design.md` | Playwright config、locator、artifact |
| devops05 | `devops05_detailed_design.md` | PostgreSQL、schema、seed、DB test |
| devops06 | `devops06_detailed_design.md` | request id、JSON log、Docker logs |
| devops07 | `devops07_detailed_design.md` | health/ready、Docker healthcheck |
| devops08 | `devops08_detailed_design.md` | failure service、logs調査、調査テンプレート |
| devops09 | `devops09_detailed_design.md` | Runbook、incident report、Docker checklist |

## 横断方針

- Docker に入れられる教材は Dockerfile または docker-compose.yml を作る。
- CI は GitHub Actions の教材例として扱い、実 push は必須にしない。
- secrets、token、password、個人情報は教材データ、ログ、artifact、Runbook に残さない。
- 作成・更新するテキストファイルは UTF-8 BOMなしとする。

## 製造時の共通検証

```powershell
rg -n "<未確定語の検索パターン>" .
docker compose config
npm.cmd run test
npm.cmd run build
```

実際に該当しないコマンドは、製造・検証記録で未実行理由を残す。
