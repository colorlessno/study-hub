# security13 レート制限 基本設計

## 0. 関連要件

- `../requirements/security13_rate_limit_requirements.md`

## 1. 設計目的

固定時間窓counterで、key・閾値・reset時刻・HTTP応答の関係を確認する。

## 2. 成果物構成

```text
src/backend/src/studysecurity/systems/security13_rate_limit/
  package.json
  app/rate_limiter.js
  app/server.js
  app/demo.js
doc/learning_notes/security13_rate_limit/
  README.md
  limit_policy.md
```

## 3. 制限policy

| 項目 | 内容 |
|---|---|
| 窓 | 10秒のfixed window |
| 上限 | keyごとに3 request |
| key | `X-Demo-User`またはsocketのIP相当値 |
| 超過 | 429、`Retry-After`、残り0 |
| 除外 | `/health` |

## 4. 処理方針

1. keyごとにcountと`resetAt`をmemoryへ保持する。
2. 現在時刻が`resetAt`以上なら新しい窓へresetする。
3. counter更新後に許可・残り回数・再試行秒数を返す。
4. HTTP層でrate limit headerへ変換する。

## 5. 安全制約

- `X-Demo-User`を認証済みidentityとして扱わない。
- local server以外へ連続requestを送らない。
- memory storeをproduction向けdistributed limiterと扱わない。

## 6. 確認観点

- 3回成功、4回目429、境界時刻で成功になること
- key変更で制限単位が変わること
- proxy、複数instance、memory増加が本番論点になること
