# web37 業務フォーム 基本設計
## 0. 関連要件

- `../requirements/web37_business_form_complete_requirements.md`

## 1. 設計目的
入力、検証、確認、送信中制御、エラー表示を持つ業務フォームを設計する。
## 2. 対象範囲

- 入力フォーム
- validation
- 確認ステップ
- submit loading
- field / form error
- success state

## 3. 成果物構成

```text
src/frontend/static/studyweb/systems/web37_business_form_complete/
  app/
  Dockerfile
doc/learning_notes/web37_business_form_complete/
  README.md
  docs/
    form_state.md
    validation_rules.md
```

## 4. 入力
| 入力| 内容|
|---|---|
| 顧客名 | 必須 |
| メール | 形式チェック|
| 備考| 任意、文字数制限|

## 5. 出力
| 出力| 内容|
|---|---|
| field error | 項目別エラー |
| confirm view | 送信前確認、入力へ戻る操作|
| submit result | 送信中、成功、送信失敗|

## 6. 処理手順
1. 入力値をstateで管理する
2. validationで項目別エラーを出す
3. 確認ステップを表示する
4. 確認画面から送信または入力修正を選ぶ
5. 送信中は送信・修正ボタンを無効化する
6. 選択した確認用結果に応じて成功またはフォーム全体エラーを表示する
7. 項目別エラーでは最初の修正対象へフォーカスを移す

## 7. 確認観点

- エラー時に修正箇所がわかる
- 二重送信を防げる
- labelとinputが対応しているか
- 入力、確認、送信中、成功、送信失敗の状態を区別できる
## 8. 後続工程への引き継ぎ

詳細設計では、入力項目、validationルール、画面状態、操作手順を定義する。
