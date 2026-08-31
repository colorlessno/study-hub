# security10 秘密情報管理 要件定義

## 1. 目的

秘密情報をsource code、Git履歴、logへ残さず、環境変数から安全に受け取る基本を学ぶ。

## 2. 学習対象

- environment variableと`.env.example`
- 起動時の必須設定検証
- secretのmaskとrotation
- 漏洩時の無効化・再発行

## 3. 作成する成果物

- 必須環境変数を検証するCLI
- 項目名だけを示す`.env.example`
- rotation手順
- Gitへ実値を入れない確認手順

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | `APP_SECRET`と`WEBHOOK_SECRET`の有無を起動時に検証できる |
| FR-02 | 不足した設定名だけをerrorとして表示できる |
| FR-03 | 設定済みの場合も値を表示せず、読み込んだ項目名だけを表示できる |
| FR-04 | 漏洩時のrotation手順を確認できる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | 実秘密情報を含めない |
| NFR-02 | サンプル値は`example-`接頭辞の明確なダミーにする |
| NFR-03 | `.env.example`には値ではなく必要項目だけを置く |

## 6. 対象外

- Secret Managerとの実接続
- 自動rotation
- CI/CDへのsecret登録

## 7. 受入条件

- 未設定時に終了codeが失敗となる
- ダミー値設定時にsecret値が標準出力へ現れない
- Git履歴へ入ったsecretは削除だけでなく無効化・再発行が必要と説明できる

## 8. 学習観点

- secretはcodeではなく実行環境から注入する設定である
- `.gitignore`は予防策であり、漏洩後の回復策ではない
- rotationでは新旧値の移行順序と監査記録も考える
