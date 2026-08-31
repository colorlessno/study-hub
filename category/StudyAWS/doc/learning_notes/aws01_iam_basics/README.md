# aws01 IAMの許可と拒否

IAMポリシーを模した4つのJSONをローカルで評価し、`allow`、`implicitDeny`、`explicitDeny`の違いと管理者権限の広さを確認する教材です。AWS CLIや認証情報は使用しません。

## このテーマでできるようになること

- Allowとaction・resourceが一致した操作が許可されることを確認できる
- 許可の記述がない操作が暗黙に拒否されることを確認できる
- Denyに一致した操作が明示的に拒否されることを確認できる
- ポリシーの記述と判定結果を照合できる
- 管理者、開発者、アプリ実行ロール、閲覧者の権限範囲を比較できる
- ローカル評価器と実際のIAMの違いを説明できる

## 最初に取り組むこと

1. StudyHubで「許可された操作」を実行し、`allow`になったpolicy、action、resourceを確認する。
2. 「許可の記述がない操作」を実行し、`implicitDeny`になった組み合わせを確認する。
3. 「明示的に拒否された操作」を実行し、`explicitDeny`になった組み合わせを確認する。
4. 「管理者権限の危険性」を実行し、actionとresourceを`*`で許可する範囲を確認する。
5. 「権限を判定する処理」と4つのポリシー、権限マトリクスを表示し、画面の判定結果とJSONを照合する。

## 3つの判定

| 判定 | 意味 | この教材での確認方法 |
|---|---|---|
| `allow` | Allowのactionとresourceに一致した | 「許可された操作」を実行する |
| `implicitDeny` | 一致するAllowがなかった | 「許可の記述がない操作」を実行する |
| `explicitDeny` | Denyのactionとresourceに一致した | 「明示的に拒否された操作」を実行する |

明示的なDenyに一致した場合は、Allowの判定よりもDenyを優先します。

## 実装を直接確認する場合

```bat
cd /d C:\work\work20260617\category\StudyAWS\src\backend\src\studyaws\systems\aws01_iam_basics
rtk npm.cmd run check
rtk node app\policy_check.js allow
rtk node app\policy_check.js implicit-deny
rtk node app\policy_check.js explicit-deny
rtk node app\policy_check.js admin-risk
```

`check`はJavaScriptの構文を確認し、4つのコマンドはStudyHubに接続した判定結果を表示します。

## この教材の範囲

- 単一のポリシーにある`effect`、`actions`、`resources`だけを簡易評価する。
- `condition`、`NotAction`、複数ポリシー、SCP、permissions boundaryは扱わない。
- ローカルの判定結果を実AWSの権限保証として使用しない。
