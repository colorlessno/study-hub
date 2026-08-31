# security05 入力検証 詳細設計
## 0. 関連文書

- `../requirements/security05_input_validation_requirements.md`
- `../basic_design/security05_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studysecurity/systems/security05_input_validation/
  Dockerfile
  package.json
  app/server.js
  app/validators.js

doc/learning_notes/security05_input_validation/
  README.md
  validation_cases.md
```

## 2. 主要設計
| 要素 | 内容 |
|---|---|
| 商品名 | 必須、文字列、最大40文字を検証する |
| 価格 | 数値、範囲、整数性を検証する |
| CSV行 | 3列であることを確認し、2列目をname、3列目をpriceとして検証する |
| エラー | フィールド単位のエラー配列で返す |
| 実行形態 | `npm run demo`で固定サンプルを標準出力へ表示する |

## 3. 安全制約
- サニタイズだけで検証済みと扱わない。
- 不正入力例はローカルのダミーデータに限定する。
- エラーに内部実装やスタックトレースを含めない。
## 4. 確認手順
1. 正常な商品入力のエラー配列が空になることを確認する。
2. 空文字、長すぎる文字列、負数がエラーになることを確認する。
3. CSV列数不一致が行番号付きで返ることを確認する。
4. エラー本文に内部情報が出ないことを確認する。
## 5. 完了条件

- 型検証、形式検証、業務検証の違いを説明できる。
- API境界で入力検証する理由を説明できる。
- エラー応答の粒度を確認できる。
