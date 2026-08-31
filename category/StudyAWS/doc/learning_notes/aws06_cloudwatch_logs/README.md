# aws06 構造化ログとrequest ID

HTTPサーバーが標準出力へ書くJSON形式のログを使い、1つの要求の開始から完了または失敗までをrequest IDから追跡します。CloudWatch Logsへは送信しません。

## このテーマでできるようになること

- それぞれの要求の開始ログと完了または失敗ログを同じrequest IDから追跡できる
- level、request ID、pathを使って対象のログを絞り込める
- tokenやメールアドレスの値をログへ残さない実装を確認できる

## 最初に取り組むこと

1. StudyHubで起動し、「正常な要求」を実行する。
2. 実行ログから、`aws06-normal-001`を持つ開始ログと完了ログを確認する。
3. 「エラーになった要求」を実行し、`aws06-error-001`を持つ開始ログと失敗ログを確認する。
4. 「機密値を残さない要求」を実行し、URLに含めた値がログへ出ないことを確認する。
5. サーバー処理、ログ項目、障害確認の順番を画面で照合し、停止する。

## 画面で確認すること

- 正常な要求は200、エラーになった要求は500になる
- 正常応答の本文とヘッダーに`aws06-normal-001`、エラー応答には`aws06-error-001`が含まれる
- 各要求の`request.started`と`request.completed`または`request.failed`を同じrequest IDで結び付けられる
- 機密値を含む要求では`/sensitive`だけが記録され、tokenとemailの値は表示されない

## コマンドで確認する場合

```cmd
cd /d C:\work\work20260617
rtk node category\StudyAWS\scripts\validate-studyaws.mjs aws06
```

## この教材で扱わないこと

CloudWatch Agent、CloudWatch Logs API、log group、log stream、保持期間、metric filter、alarmは再現しません。実AWSでは保存期間と取り込み量による課金を別途確認します。
