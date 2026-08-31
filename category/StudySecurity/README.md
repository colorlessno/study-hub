# StudySecurity

StudySecurity は、セッション認証、JWT、認可、入力検証、Web攻撃対策、監査ログ、AI安全対策、データ保持、PIIマスキングを学ぶための実装群です。

## 学習の入口

- [リポジトリ全体の学習再開ガイド](../../LEARNING_GUIDE.md)
- [全テーマカタログ](../../THEME_CATALOG.md)
- [security01 Session認証 学習ハブ](./doc/learning_notes/security01_session_auth/README.md)

最初は認証・認可の4テーマを順に進めます。

| テーマ | 学ぶ判断 | 確認URL |
|---|---|---|
| [security01 Session認証](./doc/learning_notes/security01_session_auth/README.md) | Cookieとサーバー側Sessionをどう結び付けるか | `http://localhost:4101` |
| [security02 JWT認証](./doc/learning_notes/security02_jwt_auth/README.md) | 署名と期限でtokenをどう検証するか | `http://localhost:4102` |
| [security03 RBAC](./doc/learning_notes/security03_rbac/README.md) | roleを操作権限へどう対応付けるか | `http://localhost:4103` |
| [security04 ABAC](./doc/learning_notes/security04_abac/README.md) | role以外の属性を認可条件へどう加えるか | `http://localhost:4104` |

この4テーマは、認証済みユーザーを本物の認証基盤で確立する一体型アプリではありません。各方式の判断点を小さく分離したローカル教材です。security03とsecurity04の`X-User`は、サーバー内の固定ユーザーを選ぶための学習用入力であり、本番の本人確認には使えません。

次に、信頼できない入力とbrowser経由のrequest・表示・file metadataを扱います。

| テーマ | 学ぶ境界 | 実行形態 |
|---|---|---|
| [security05 入力検証](./doc/learning_notes/security05_input_validation/README.md) | 型・形式・範囲をどこで拒否するか | CLI demo |
| [security06 SQL Injection](./doc/learning_notes/security06_sql_injection/README.md) | SQL構文と入力値をどう分離するか | CLI demo |
| [security07 CSRF](./doc/learning_notes/security07_csrf/README.md) | Cookie付き状態変更requestをどう検証するか | `http://localhost:4107` |
| [security08 XSS](./doc/learning_notes/security08_xss/README.md) | browserの出力contextでどう安全に表示するか | `http://localhost:4108` |
| [security09 File upload](./doc/learning_notes/security09_file_upload/README.md) | metadata検証と実file検査をどう分けるか | `http://localhost:4109` |

security05と06は構造を標準出力で比較する教材、security07はlocal HTTP、security08と09は静的画面です。危険な入力や状態変更はローカルのダミーデータに限定し、外部systemへの攻撃や実fileのuploadは行いません。

続いて、applicationを安全に運用・連携するための境界を学びます。

| テーマ | 学ぶ運用判断 | 実行形態 |
|---|---|---|
| [security10 秘密情報管理](./doc/learning_notes/security10_secret_management/README.md) | secretをcode・Git・logからどう分離するか | CLI demo |
| [security11 Webhook署名](./doc/learning_notes/security11_webhook_signature/README.md) | 改ざん検知とreplay防止をどう分けるか | CLI / `http://localhost:4111` |
| [security12 監査ログ](./doc/learning_notes/security12_audit_log/README.md) | 調査可能性とdata最小化をどう両立するか | CLI demo |
| [security13 レート制限](./doc/learning_notes/security13_rate_limit/README.md) | key・閾値・時間窓をどう決めるか | CLI / `http://localhost:4113` |
| [security14 CORS](./doc/learning_notes/security14_cors/README.md) | browserへ許可するOriginをどう絞るか | `http://localhost:4114` |
| [security15 Security headers](./doc/learning_notes/security15_security_headers/README.md) | browserの防御policyをresponseでどう伝えるか | `http://localhost:4115` |
| [security16 依存関係管理](./doc/learning_notes/security16_dependency_management/README.md) | 脆弱性reportを対応判断へどう変えるか | CLI demo |

security10〜16は、実secret、外部Webhook、外部traffic、実package更新を扱いません。localのダミーdataで判断点を再現し、本番ではSecret Manager、永続store、distributed limiter、production Origin、HTTPS、test・互換性確認が追加で必要になることを区別します。

最後に、AIへ渡す入力・検索文書・保持data・個人情報・出力policyの境界を学びます。

| テーマ | 学ぶAI・data判断 | 実行形態 |
|---|---|---|
| [security17 Prompt Injection](./doc/learning_notes/security17_prompt_injection/README.md) | 入力分類を過信せず権限・出力をどう制限するか | CLI / `http://localhost:4117` |
| [security18 RAG安全対策](./doc/learning_notes/security18_rag_safety/README.md) | source・trust・accessをどう分けるか | CLI / `http://localhost:4118` |
| [security19 Data保持・削除](./doc/learning_notes/security19_data_retention/README.md) | retention・legal hold・dry runをどう扱うか | CLI demo |
| [security20 PII masking](./doc/learning_notes/security20_pii_masking/README.md) | log・AI入力の前に何を伏せるか | CLI demo |
| [security21 AI content moderation](./doc/learning_notes/security21_ai_content_moderation/README.md) | context・判定・安全応答・reviewをどう結ぶか | CLI demo |

security17〜21は外部AI API、vector DB、実個人情報、実data削除を使いません。抽象化したdummy caseでpolicyの判断点を観察し、単純なpattern判定やtrust labelだけではproductionの安全性を保証できないことを前提にします。

## 構成

```text
category/StudySecurity/
  src/backend/src/studysecurity/systems/security01_session_auth/
  src/backend/src/studysecurity/systems/security20_pii_masking/
  doc/requirements/
  doc/basic_design/
  doc/detailed_design/
  doc/learning_notes/
  doc/reviews/
```

実装単位は `src/backend/src/studysecurity/systems/` に集約し、各番号のREADMEと補足資料は `doc/learning_notes/<securityXX_*>/` に配置しています。

## 実装一覧

- `security01_session_auth`
- `security02_jwt_auth`
- `security03_rbac`
- `security04_abac`
- `security05_input_validation`
- `security06_sql_injection`
- `security07_csrf`
- `security08_xss`
- `security09_file_upload`
- `security10_secret_management`
- `security11_webhook_signature`
- `security12_audit_log`
- `security13_rate_limit`
- `security14_cors`
- `security15_security_headers`
- `security16_dependency_management`
- `security17_prompt_injection`
- `security18_rag_safety`
- `security19_data_retention`
- `security20_pii_masking`
- `security21_ai_content_moderation`

## 実行例
```powershell
npm.cmd --prefix category/StudySecurity/src/backend/src/studysecurity/systems/security01_session_auth run check
```

## 代表テーマの自動テスト

4つの学習グループから1テーマずつ選び、外部serviceや追加packageを使わずに実装境界を検証します。各テーマは単独で実行できます。

```powershell
npm.cmd --prefix category/StudySecurity/src/backend/src/studysecurity/systems/security03_rbac test
npm.cmd --prefix category/StudySecurity/src/backend/src/studysecurity/systems/security05_input_validation test
npm.cmd --prefix category/StudySecurity/src/backend/src/studysecurity/systems/security11_webhook_signature test
npm.cmd --prefix category/StudySecurity/src/backend/src/studysecurity/systems/security21_ai_content_moderation test
```

| 学習グループ | 代表テーマ | 検出するずれ |
|---|---|---|
| 認証・認可 | security03 | 401・403・200とrole別permission |
| 入力・browser攻撃 | security05 | 型・長さ・数値・CSV列数の境界 |
| 連携・運用防御 | security11 | raw body署名・5分期限・replay |
| AI・data安全 | security21 | category・context・decision・reason code |

Docker 対応済みの番号は、各実装ディレクトリをビルドコンテキストにして確認します。
```powershell
docker build -t studysecurity-security01 .
docker run --rm studysecurity-security01
```

サーバーとして常駐する番号は、各テーマREADMEに記載したポートで起動し、確認後に`Ctrl+C`で停止します。

## security21 の構成について

`security21_ai_content_moderation` は、taxonomy・判定ケース表・監査ログスキーマ等の教材文書（`doc/learning_notes/security21_ai_content_moderation/`）を**ポリシー仕様**とし、それを実行形にした moderation 判定エンジンを実装しています。`npm run demo` で抽象ケース M-001〜M-006 の判定が期待値と一致するかを検証できます。入力は意図の抽象サマリのみで、不適切内容の本文は扱いません。
