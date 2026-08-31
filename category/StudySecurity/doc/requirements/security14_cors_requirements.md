# security14 CORS 要件定義

## 1. 目的

browserがcross-origin responseをJavaScriptへ公開する条件と、認証・認可との違いを学ぶ。

## 2. 学習対象

- Origin allowlist
- preflight request
- credentials
- `Vary: Origin`

## 3. 作成する成果物

- allowlist型CORS server
- 許可・不許可Originの確認手順
- CORS matrix
- 認証・CSRFとの違いを示す学習note

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | 2つのlocal Originだけを明示的に許可できる |
| FR-02 | 許可Originの`OPTIONS`へ204と許可method・headerを返せる |
| FR-03 | 不許可Originのpreflightを403にできる |
| FR-04 | credentials利用時にrequest Originをそのまま許可headerへ返せる |
| FR-05 | Originにより応答が変わることを`Vary`でcacheへ伝えられる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | `*`とcredentialsを組み合わせない |
| NFR-02 | CORSをAPI access制御として説明しない |
| NFR-03 | 確認はlocal HTTP requestに限定する |

## 6. 対象外

- production domain設定
- browser automation
- authenticationとauthorizationの実装

## 7. 受入条件

- 許可OriginではCORS header、不許可Originでは403または許可headerなしを確認できる
- simple requestとpreflightの差を説明できる
- CORSがcurl等のserver accessを止めないと説明できる

## 8. 学習観点

- CORSの強制主体はbrowserである
- credentialsを許可する場合はOriginを狭く管理する
- CSRF対策、認証、認可は別の防御層である
