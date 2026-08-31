# security10 秘密情報管理 基本設計

## 0. 関連要件

- `../requirements/security10_secret_management_requirements.md`

## 1. 設計目的

必須secretを実行環境から受け取り、不足時はfail fastし、値をlogへ出さない流れを確認する。

## 2. 成果物構成

```text
src/backend/src/studysecurity/systems/security10_secret_management/
  .env.example
  package.json
  app/config.js
doc/learning_notes/security10_secret_management/
  README.md
  secret_rotation.md
```

## 3. 入出力

| 種別 | 内容 |
|---|---|
| 入力 | `APP_SECRET`、`WEBHOOK_SECRET`環境変数 |
| 成功出力 | 読み込んだ設定名と`values: masked` |
| 失敗出力 | 不足した設定名と終了code 1 |

## 4. 処理方針

1. 必須設定名を配列で一元管理する。
2. 空文字を未設定として扱う。
3. 値は保持・表示せず、教材では存在確認だけを行う。
4. rotationは新値追加、切替確認、旧値失効、監査記録の順で考える。

## 5. 安全制約

- `.env.example`には項目名と明確なplaceholderだけを置く。
- 実secret、実token、実passwordを使わない。
- Git履歴へ入った値は削除だけで回復したと扱わない。

## 6. 確認観点

- 未設定時と設定時の終了code・出力の差
- error messageに値が含まれないこと
- `.env.example`と実行環境の責務の違い
