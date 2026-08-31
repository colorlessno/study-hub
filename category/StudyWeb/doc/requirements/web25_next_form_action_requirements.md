# web25_next_form_action 要件定義

## 1. 目的
Next.js のフォーム送信処理を作り、React + NestJS の分割構成とは異なるフルスタック密結合の実装を理解する。

## 2. 対象ユーザー

- Next.js だけでフォーム処理を作る流れを学びたい人
- Server Actions の入口を体験したい人
- フルスタック密結合の構成を比較したい人

## 3. 作成する成果物

フォーム送信と結果表示を行う Next.js アプリを作成する。
想定ファイル構成:

```text
src/frontend/src/studyweb/systems/web25_next_form_action/
  package.json
  app/
    page.tsx
    actions.ts
category/StudyWeb/doc/learning_notes/web25_next_form_action/
  README.md
```

## 4. 機能要件

### 4.1 フォーム表示

- タスクまたは問い合わせ入力フォームを表示すること
- 必須項目がわかるようにすること
- 送信ボタンを表示すること

### 4.2 送信処理
- フォーム送信を Next.js 側で処理すること
- 入力値を受け取り、簡易バリデーションを行うこと
- 正常時と異常時のメッセージを表示すること

### 4.3 比較・説明
- README に React + NestJS 分割構成との違いを記載すること
- どの処理がサーバー側で行われるか説明すること

## 5. 非機能要件

- Next.js + TypeScript を使うこと
- App Router を使うこと
- DB保存は必須にしないこと
- 学習しやすい小構成にすること

## 6. 学習ポイント
- Next.js のフォーム処理
- Server Actions の入口
- サーバー側バリデーション
- 分割構成とフルスタック構成の違い

## 7. 完了条件

- フォームが表示される
- 正常入力で成功メッセージが表示される
- 不正入力でエラーメッセージが表示される
- README に起動方法と構成比較が書かれている

## 8. 対象外
- 本格的なDB保存
- 認証
- メール送信
- 複雑なフォームライブラリ
- 本番デプロイ
