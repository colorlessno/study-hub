# web15_api_error_patterns 要件定義

## 1. 目的
API の正常系と異常系を確認できるエンドポイントを作り、HTTPステータス 200 / 400 / 404 / 500 の違いを理解する。

## 2. 対象ユーザー

- API のエラーハンドリングを学びたい人
- フロントエンドでエラー表示を作る前提を知りたい人
- HTTPステータスの意味を体験したい人

## 3. 作成する成果物

複数のステータスコードを返す NestJS API を作成する。
想定ファイル構成:

```text
src/backend/src/studyweb/systems/web15_api_error_patterns/
  package.json
  src/
    errors/
      errors.controller.ts
      errors.service.ts
      errors.module.ts
    app.module.ts
    main.ts
```

学習手順は `doc/learning_notes/web15_api_error_patterns/README.md` に配置する。

## 4. 機能要件

### 4.1 正常系

- `GET /status/ok` で 200 を返すこと
- 正常レスポンスのJSONを返すこと

### 4.2 クライアントエラー

- `GET /status/bad-request` で 400 を返すこと
- `GET /status/not-found` で 404 を返すこと
- エラー理由がJSONで返ること

### 4.3 サーバーエラー

- `GET /status/server-error` で 500 を返すこと
- 意図的な例外または NestJS の例外クラスで実装すること

## 5. 非機能要件

- NestJS と TypeScript を使うこと
- 各エラーは再現しやすい固定エンドポイントにすること
- README にステータスコードの意味を簡潔に書くこと
- DBや外部APIに依存しないこと

## 6. 学習ポイント
- HTTPステータスコードの役割
- 400 と 404 の違い
- 500 がサーバー側の問題を示すこと
- フロントエンドでレスポンスステータスを見て処理を分ける考え方

## 7. 完了条件

- 200 / 400 / 404 / 500 の各レスポンスを確認できる
- curl などでステータスコードを確認できる
- README に確認コマンドと期待結果が書かれている

## 8. 対象外
- 本格的なログ基盤
- グローバル例外フィルタの詳細実装
- 認証エラー
- データベース
- フロントエンド画面
