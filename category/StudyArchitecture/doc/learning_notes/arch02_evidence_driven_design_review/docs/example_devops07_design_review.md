# 記述例: devops07 証拠ベース設計レビュー

## review対象

| 項目 | 値 |
| --- | --- |
| system | `category/StudyDevOps/src/apps/devops07_health_check_endpoint` |
| reviewする動作 | `/health`、`/ready`、Docker healthcheck |
| review観点 | 運用性と正しさ |
| 証拠範囲 | 現在のrepository状態と過去の検証記録 |

## 証拠checklist

| check | result | 証拠 |
| --- | --- | --- |
| entry point確認 | OK | `app/server.js` |
| health endpoint確認 | OK | `app/server.js` の GET `/health` 分岐 |
| readiness endpoint確認 | OK | `app/server.js` の GET `/ready` 分岐 |
| Docker healthcheck確認 | OK | `docker-compose.yml` |
| smoke test確認 | OK | `tests/health.test.js` |
| 過去runtime検証確認 | OK | `category/StudyDevOps/doc/implementation_verification_devops01_devops09.md` |

## 証拠mapping

| 主張 | 証拠 | confidence | 未解決の問い |
| --- | --- | --- | --- |
| serviceはliveness endpointを公開している。 | `app/server.js` が `GET /health` を扱う。 | 高 | ない |
| serviceはlivenessとreadinessを分けている。 | `app/server.js` が dependency state 付きで `GET /ready` を扱う。 | 高 | ない |
| Docker healthcheckはreadinessではなくlivenessを使う。 | `docker-compose.yml` が `/health` をprobeする。 | 高 | productionでもこれが望ましいか。 |
| 通常ready状態はtestされている。 | `tests/health.test.js` が `/health` と `/ready` の200を確認する。 | 高 | negative readinessはtestされていない。 |
| runtime動作は過去に検証済み。 | `implementation_verification_devops01_devops09.md` に `/health`、`/ready`、healthy status の記録がある。 | 中 | この例には実command outputそのものは貼っていない。 |

## 指摘

### Low: negative readiness behavior は実装されているが smoke test で確認されていない
Impact:
このsampleには `/toggle-dependency` によるdependency failure pathがあるが、現在のtestは通常ready状態しか確認していないため、learnerがlivenessとreadinessの違いを失敗時に見落とす可能性がある。
Evidence:
`app/server.js` は `dependencyOk` が false のとき `/ready` で503を返せる。`tests/health.test.js` は初期状態の200 responseのみを確認している。
Recommendation:
`POST /toggle-dependency` を呼んだ後、`GET /ready` が503、`GET /health` が200のままであることを確認するtestを追加する。
## 残リスク

| risk | 状態 |
| --- | --- |
| このarchitecture例の作成時にはruntimeを再実行していない | 受容。過去のStudyDevOps検証でruntime OKを記録済み |
| negative readiness behaviorが自動化されていない | 指摘として記録 |
| productionでhealthcheck targetをどうするか | この学習sampleでは対象外 |

## review結果

この設計は学習単元として整合している。`/health` はprocess liveness、`/ready` はdependency readinessを表し、Dockerはcontainer healthに `/health` を使っている。主な改善点は、readiness失敗時のtestを追加して、source code上の分岐だけでなく実行証拠でも違いを示すこと。
