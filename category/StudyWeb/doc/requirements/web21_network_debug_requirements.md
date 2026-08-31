# web21_network_debug 要件定義

## 1. 目的
DevTools を使って通信を確認し、フロントエンド、API、DB のどこで問題が起きているか切り分ける練習をする。

## 2. 対象ユーザー

- Webアプリが動かないとき調査方法を学びたい人
- Network タブでリクエストとレスポンスを確認したい人
- APIエラーと画面エラーを切り分けたい人

## 3. 作成する成果物

成功・失敗を意図的に再現できるフロントエンドとAPIを作成する。
想定ファイル構成:

```text
src/infra/compose/web21_network_debug/
  docker-compose.yml
src/backend/src/studyweb/systems/web21_network_debug/backend/
src/frontend/src/studyweb/systems/web21_network_debug/frontend/
doc/learning_notes/web21_network_debug/README.md
```

## 4. 機能要件

### 4.1 成功リクエスト
- 画面から成功APIを呼び出せること
- Network タブで 200 レスポンスを確認できること

### 4.2 失敗リクエスト
- 400 / 404 / 500 のいずれかを再現できること
- 画面にエラーメッセージを表示すること
- Network タブでステータスとレスポンス本文を確認できること

### 4.3 切り分け練習
- API URL の間違い例を確認できること
- API停止時の挙動を確認できること
- README に調査手順を記載すること

## 5. 非機能要件

- React + NestJS を使うこと
- Docker Compose で起動できること
- エラー再現は学習目的としてわかりやすく固定すること
- DBは必須ではないこと

## 6. 学習ポイント
- Network タブの見方
- Request URL、Method、Status、Response の確認
- CORS、400 / 404 / 500 の違い
- フロントとAPIの責務の切り分け

## 7. 完了条件

- 成功APIと失敗APIを画面から呼び出せる
- Network タブでステータスを確認できる
- README に典型的な切り分け手順が書かれている

## 8. 対象外
- 本格的な監視
- ログ収集基盤
- 認証
- DB障害の詳細調査
- E2Eテスト
