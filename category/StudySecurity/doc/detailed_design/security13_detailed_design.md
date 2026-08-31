# security13 レート制限 詳細設計
## 0. 関連文書

- `../requirements/security13_rate_limit_requirements.md`
- `../basic_design/security13_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studysecurity/systems/security13_rate_limit/
  Dockerfile
  package.json
  app/server.js
  app/rate_limiter.js
  app/demo.js
```

## 2. 主要設計
| 要素 | 内容 |
|---|---|
| キー | IP相当値とユーザーID相当値を切り替える |
| 窓 | 固定時間窓のカウンタで実装する |
| 応答 | 残り回数を返し、超過時は429と`Retry-After`を返す |
| 例外 | ヘルスチェックは制限対象外にする |

## 3. 安全制約
- 負荷試験や外部サービスへの連続送信は行わない。
- 学習用の短い閾値でローカル確認に限定する。
- レート制限だけで認証防御が完成するとは説明しない。
## 4. 確認手順
1. 制限回数内のリクエストが成功することを確認する。
2. 制限超過で429になることを確認する。
3. 時間窓経過後に再度成功することを確認する。
4. `Retry-After`の意味を読む。
## 5. 完了条件

- レート制限のキー設計を説明できる。
- 429の意味を説明できる。
- ローカルで制限超過を再現できる。
