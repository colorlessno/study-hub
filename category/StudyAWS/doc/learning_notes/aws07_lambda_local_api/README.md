# aws07 Lambda handlerの直接呼出し

Lambda handlerへeventとcontextを直接渡し、HTTP形式の応答が返るまでを確認するテーマです。AWSへ接続せず、Node.jsだけで実行します。

## このテーマでできるようになること

- 正常なeventとnameがないeventで、handlerの応答が変わることを確認できる
- event、context、handlerの戻り値の関係を説明できる
- 環境変数、メモリ上限、残り時間、function名が実行環境からhandlerへ渡る意味を説明できる
- Node.jsによる直接呼出しと実際のLambda環境の違いを説明できる

## 最初に取り組むこと

1. StudyHubで「正常なeventを渡す」を実行し、statusCode、message、requestIdを確認する。
2. 「nameがないeventを渡す」を実行し、statusCode 400とname_requiredを確認する。
3. 「実行環境を確認」を実行し、`welcome runtime`とruntime項目を確認する。
4. 「正常なeventの例」と「Lambda handler」を開き、入力値が応答へ使われる箇所を照合する。
5. 「ローカル呼出し処理」と「SAM template」を開き、直接呼出しとSAM実行の入口を確認する。

StudyAWS全体の検証だけを行う場合は、リポジトリのルートで次を実行します。

```bat
rtk node category\StudyAWS\scripts\validate-studyaws.mjs aws07
```

## 確認できる範囲

このテーマではhandlerの入出力と、直接呼出し用に模擬した環境変数、メモリ上限、残り時間を確認します。IAM、実際のタイムアウト、コールドスタート、CloudWatchは再現しません。SAM CLIが利用できる場合だけ、表示したtemplateとeventで`sam local invoke HelloFunction -e events/hello.json`へ発展できます。
