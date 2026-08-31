# 記述例: devops07 のシステム構造

## 対象

| 項目 | 値 |
| --- | --- |
| Study領域 | StudyDevOps |
| 単体 | `src/apps/devops07_health_check_endpoint` |
| 主目的 | `/health` と `/ready` を公開し、Docker healthcheck と接続する |
| runtime | Docker Compose 上の Node.js HTTP server |

## Context

| actor | 目的 | 証拠 |
| --- | --- | --- |
| learner | health と readiness の違いを理解する | `category/StudyDevOps/doc/learning_notes/devops07_health_check_endpoint/README.md` |
| Docker | containerのhealthを判断する | `category/StudyDevOps/src/apps/devops07_health_check_endpoint/docker-compose.yml` |
| smoke test | endpointの動作を確認する | `category/StudyDevOps/src/apps/devops07_health_check_endpoint/tests/health.test.js` |

## Container

| container | 責務 | 証拠 |
| --- | --- | --- |
| `app` | Node.js health API を動かす | `docker-compose.yml` の service `app` |
| Node.js process | `/health`、`/ready`、`/toggle-dependency` を提供する | `app/server.js` |

## Component

| component | 責務 | 証拠 |
| --- | --- | --- |
| `/health` route | 基本的なliveness statusを返す | `app/server.js` の GET `/health` 分岐 |
| `/ready` route | dependencyを考慮したreadinessを返す | `app/server.js` の GET `/ready` 分岐 |
| `dependencyOk` state | dependency failureを模擬する | `app/server.js` の module変数 |
| Docker healthcheck | container内からlivenessを確認する | `docker-compose.yml` の healthcheck |
| test case | 通常状態で `/health` と `/ready` が200を返すことを確認する | `tests/health.test.js` |

## request と data の流れ

| step | actor または component | action | 証拠 |
| ---: | --- | --- | --- |
| 1 | Docker healthcheck | `http://localhost:8080/health` を呼ぶ | `docker-compose.yml` |
| 2 | Node.js server | `GET /health` に一致する | `app/server.js` |
| 3 | `send` helper | status code 200 のJSONを返す | `app/server.js` |
| 4 | Docker | probe成功後にcontainerをhealthyと判断する | `docker-compose.yml` healthcheck settings |

## 失敗mode

| 失敗 | 見える症状 | 疑うcomponent | 確認する証拠 |
| --- | --- | --- | --- |
| app processがlistenしない | healthcheckが失敗する | Node.js process または Dockerfile | compose ps、container logs |
| dependency simulationがoffになる | `/ready` が503を返す | `dependencyOk` state | POST `/toggle-dependency`、GET `/ready` |
| port mappingが違う | host側curlが失敗するがcontainer healthは通る可能性がある | compose ports | `18087:8080` mapping |

## 構成判断

| 判断 | 証拠 | tradeoff | 代替案 |
| --- | --- | --- | --- |
| `/health` と `/ready` を分ける | `app/server.js` に別分岐がある | livenessを単純に保ち、readinessにdependencyを含められる | 1つのendpointに意味を混ぜる |
| Docker healthcheckは `/health` を使う | `docker-compose.yml` healthcheck | dependency failureでcontainer livenessを壊さない | `/ready` をprobeしてdependency issue時にrestartする |
| dependencyをmemoryで模擬する | `dependencyOk` variable | 単体を小さく決定的に保てる | 実DBや外部serviceを追加する |

## 証拠と推測

| 主張 | 種別 | source |
| --- | --- | --- |
| `/health` は `{ status: "ok" }` を返す | 証拠 | `app/server.js` |
| `/ready` は503を返しうる | 証拠 | `app/server.js` |
| Docker はcontainer内から `/health` を確認する | 証拠 | `docker-compose.yml` |
| livenessをdependency readinessから独立させる意図がある | 推測 | route分岐とhealthcheck target |

## 結論
`devops07` は運用設計の小さな例として使いやすい。liveness と readiness を分け、Dockerには安定したhealth targetを与え、dependency failureは `/ready` で見えるようにしている。
