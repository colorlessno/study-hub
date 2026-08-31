# web49 retry / timeout 基本設計
## 0. 関連要件

- `../requirements/web49_retry_timeout_requirements.md`

## 1. 設計目的
timeoutとretryの基本動作を確認できる外部呼び出し風サンプルを設計する。
## 2. 対象範囲

- timeout
- retry上限
- 一時失敗
- 恒久失敗
- retry log

## 3. 成果物構成

```text
src/backend/src/studyweb/systems/web49_retry_timeout/
  api/
  Dockerfile
  package.json
doc/learning_notes/web49_retry_timeout/
  README.md
  docs/
    retry_policy.md
    timeout_check.md
```

## 4. 入力
| 入力| 内容|
|---|---|
| request mode | success / slow / temporary failure / permanent failure |
| timeout ms | 待ち上限 |
| max retry | retry回数 |

## 5. 出力
| 出力| 内容|
|---|---|
| result | 成功・失敗|
| retry log | retry回数と理由 |
| timeout error | timeout発生|

## 6. 処理手順
1. 失敗パターンを切り替えられるAPIを用意する
2. clientでtimeoutを設定する
3. 一時失敗だけretryする
4. 上限到達時に失敗にする
5. retryログを表示する

## 7. 確認観点

- 無限retryしていないか
- retry対象外エラーを区別できる
- timeoutが効くか

## 8. 後続工程への引き継ぎ

詳細設計では、失敗パターン、retry policy、ログ形式を定義する。
