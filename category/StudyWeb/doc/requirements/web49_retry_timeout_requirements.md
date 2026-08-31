# web49 retry / timeout 要件定義

## 1. 目的

外部APIや長時間処理で発生する timeout、一時失敗、retry の基本を学ぶ。

## 2. 学習対象

- timeout
- retry
- max retry
- backoff
- transient failure
- permanent failure

## 3. 作成する成果物

- timeout再現API
- retry付き呼び出しサンプル
- 成功・失敗ログ
- retry設計メモ

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | timeout を設定できる |
| FR-02 | 一時失敗時にretryできる |
| FR-03 | retry上限を設定できる |
| FR-04 | 成功、retry中、失敗をログに残せる |
| FR-05 | retryしてはいけないエラーを区別できる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | 無限retryしない |
| NFR-02 | 利用者に処理中か失敗かを表示できる |
| NFR-03 | 外部APIやLLM呼び出しへ応用できる |

## 6. 対象外

- 本格キュー
- circuit breaker
- 分散トレーシング

## 7. 受入条件

- timeout時の挙動を確認できる
- retry成功とretry失敗を確認できる
- retry対象外エラーを説明できる

## 8. 学習観点

- 外部連携は失敗する前提で設計する
- retryは万能ではない
- timeoutなしは障害時に詰まりやすい
