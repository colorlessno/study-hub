# security14 CORS 基本設計

## 0. 関連要件

- `../requirements/security14_cors_requirements.md`

## 1. 設計目的

Origin allowlistとpreflight応答を通じ、browserのresponse公開制御を確認する。

## 2. 成果物構成

```text
src/backend/src/studysecurity/systems/security14_cors/
  package.json
  app/server.js
doc/learning_notes/security14_cors/
  README.md
  cors_matrix.md
```

## 3. CORS policy

| 項目 | 内容 |
|---|---|
| 許可Origin | `http://localhost:3000`、`http://localhost:5173` |
| 許可method | GET、POST、OPTIONS |
| 許可header | Content-Type、Authorization |
| credentials | 許可Originだけ`true` |
| cache | Origin・preflight条件を`Vary`へ含める |

## 4. 処理方針

1. request Originを完全一致のallowlistで判定する。
2. 許可Originのpreflightへ204とCORS headerを返す。
3. 不許可Originのpreflightへ403を返す。
4. 通常requestは処理するが、不許可Originへ許可headerを返さない。

## 5. 安全制約

- credentials利用時にwildcard Originを使わない。
- CORSをserver-side access制御として扱わない。
- 外部siteを検証対象にしない。

## 6. 確認観点

- 許可・不許可Originでheaderがどう変わるか
- curlがresponseを受け取れてもbrowser JavaScriptは読めない場合があること
- CORS、CSRF、認証、認可の責務の違い
