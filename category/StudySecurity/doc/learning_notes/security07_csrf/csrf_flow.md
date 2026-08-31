# CSRFフロー

Cookieだけで状態変更できる設計はCSRFの影響を受けます。フォームに一回限りのトークンを含め、サーバ側で照合します。

```text
GET /form
  ├─ Set-Cookie: sid=demo; HttpOnly; SameSite=Lax
  └─ form hidden value: random CSRF token（5分期限）

POST /transfer
  ├─ sid Cookieなし              → 401
  ├─ sidあり / tokenなし・不正   → 403
  ├─ sidあり / token正しい       → 200、tokenを削除
  └─ 同じtokenを再利用           → 403
```

Cookieはbrowserが自動送信します。CSRF tokenはresponse本文から正規画面が取得し、状態変更requestへ明示的に含めます。XSSで同一originのscriptを実行されるとtokenを読まれる可能性があるため、XSS対策も別途必要です。
