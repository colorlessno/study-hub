# security01 Session認証 基本設計
## 0. 関連要件

- `../requirements/security01_session_auth_requirements.md`

## 1. 設計目的
Cookie + Session による認証状態管理を最小構成で確認する。
## 2. 対象範囲

- login / logout
- session id cookie
- protected API
- 401 response
- Cookie属性確認
## 3. 成果物構成

```text
src/backend/src/studysecurity/systems/security01_session_auth/
  README.md
  app/
  docs/auth_flow.md
  docs/cookie_check.md
```

## 4. 入力
| 入力 | 内容 |
|---|---|
| login情報 | 学習用固定ユーザー |
| Cookie | session id |
| API request | Cookieあり・なし |

## 5. 出力
| 出力 | 内容 |
|---|---|
| 認証結果 | login成功・失敗 |
| protected response | 200 / 401 |
| Cookie確認 | sid属性 |

## 6. 処理方針
1. loginでsessionを作成する
2. sidをHttpOnly Cookieとして返す
3. protected APIでsidを検証する
4. logoutでsessionを削除する
5. Cookie属性と401を確認する
## 7. 確認観点

- Cookieにユーザー情報を直接入れていないか
- 未ログイン時に401になるか
- 本番ではSession storeが必要と説明できるか
## 8. 後続工程への引き継ぎ

詳細設計では、API、Cookie属性、session保存形式、確認手順を定義する。
