# StudyWeb

StudyWebは、Web開発の基礎から業務Web、API、Docker、ファイル取込、非同期処理、DB性能、表示方式の選定までを52テーマで段階的に学ぶ実装・文書群です。

完成コードを読むだけでなく、各テーマの`doc/learning_notes/webXX_*/README.md`を入口として、要件、設計、実装を横断し、「動かす → 観察する → 壊して確かめる → 自分の言葉で説明する」までを学習単位とします。

## 学習の入口

- [リポジトリ全体の学習再開ガイド](../../LEARNING_GUIDE.md)
- [全テーマカタログ](../../THEME_CATALOG.md)
- [web01: HTML / CSS / JavaScriptの役割分担](./doc/learning_notes/web01_static_first_page/README.md)
- [web52: 現代Web表示方式の比較](./doc/learning_notes/web52_modern_rendering_comparison/README.md)
- [StudyWeb構造監査](./doc/reviews/studyweb_completion_audit.md)

## 52テーマの学習グループ

物理的な配置は現在の`webXX`を維持し、学習目的に応じて次の論理グループで捉えます。

| Theme | 学習グループ | 主な内容 |
|---|---|---|
| web01〜06 | Browser foundations | HTML、CSS、path、DOM、responsive、form |
| web07〜12 | Frontend UI | React、component、state、TypeScript、Tailwind、dashboard UI |
| web13〜18 | API and data | NestJS、error response、Prisma、relation、migration / seed |
| web19〜22 | Full-stack communication | fetch、mutation、Network調査、TanStack Query |
| web23〜28 | Modern runtime | Next.js、Server Component、Form Action、Docker、Nginx、環境変数 |
| web29〜31 | Learning operations | README、error log、Issue / PRによる学習記録 |
| web32〜36 | HTTP and browser state | header、Cookie / Session、CORS、status、localStorage |
| web37〜40 | Frontend workflows | 業務form、routing、fallback、table操作 |
| web41〜45 | API and business rules | error形式、pagination API、冪等性、状態遷移、楽観lock |
| web46〜51 | Files, async, performance | CSV、PDF、job、retry、N+1、DB index |
| web52 | Architecture selection | MPA、SPA、SSR、SSG等を要件から比較するcapstone |

このグループはStudy Hubで再編可能な分類として扱い、theme IDやsource pathは変更しません。

## リポジトリ構成

```text
category/StudyWeb/
  src/frontend/src/studyweb/systems/
  src/frontend/static/studyweb/systems/
  src/backend/src/studyweb/systems/
  src/infra/
  doc/requirements/
  doc/basic_design/
  doc/detailed_design/
  doc/learning_notes/
  doc/templates/
  doc/reviews/
```

実装は用途に応じてfrontend、backend、infraへ分かれています。1テーマが複数の配置を使う場合も、同じ`webXX` IDで関連付けます。

## 構造監査結果

2026-08-07時点の構造監査では、web01〜52の全IDについて次を確認しています。

| 成果物 | 結果 |
|---|---|
| 要件定義 | 52 IDすべて存在 |
| 基本設計 | 52 IDすべて存在 |
| 詳細設計 | 52 IDすべて存在 |
| 学習ノート | 52 IDすべて存在 |
| 実装型テーマ | 48 IDすべて`src/`に配置 |
| 文書完結型テーマ | web29、web30、web31、web52 |

これは構造と導線の監査結果です。全実装を同じ環境で再実行済み、または全要件を本番品質で実装済みという意味ではありません。詳細は[StudyWeb構造監査](./doc/reviews/studyweb_completion_audit.md)を参照してください。

## データベース接続情報について

一部のサンプル（web16以降のPrisma / PostgreSQL系）の`docker-compose.yml`には、接続情報として`postgres / postgres`が含まれます。これはローカル開発・学習用の慣例的なdefault値です。本番等で利用する場合は`.env`や環境変数（`POSTGRES_PASSWORD` / `DATABASE_URL`等）で必ず上書きしてください。

## 文書完結型テーマについて

web29（README template）、web30（error log note）、web31（Issue / PR style）、web52（rendering方式比較）は、詳細設計の製造対象をコードではなく`doc/learning_notes/`配下の文書として定義しています。対応するコードが`src/`にないのは意図した構成です。

## 検証

リポジトリrootから次を実行すると、UTF-8、Markdown link、theme catalogを検証できます。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate_portfolio.ps1
```

追加packageや固定portを使わない最初の代表自動テストとして、次の5テーマを個別に検証できます。

```powershell
npm.cmd --prefix category/StudyWeb/src/backend/src/studyweb/systems/web28_env_config/backend test
npm.cmd --prefix category/StudyWeb/src/backend/src/studyweb/systems/web33_cookie_session test
npm.cmd --prefix category/StudyWeb/src/backend/src/studyweb/systems/web42_pagination_sort_filter_api test
npm.cmd --prefix category/StudyWeb/src/backend/src/studyweb/systems/web43_idempotency_key test
npm.cmd --prefix category/StudyWeb/src/backend/src/studyweb/systems/web48_job_status_api test
```

| テーマ | 自動検証する境界 |
|---|---|
| web28 | 必須環境変数、port範囲、公開設定と非公開設定 |
| web33 | login、Cookie属性、Session参照、logout |
| web42 | filter、sort、pagination、query validation |
| web43 | 初回処理、同一requestの再送、payload衝突、不正JSON |
| web48 | 202受付、queued・running・succeeded、unknown job |

これはbackend HTTP境界の最初の保守証跡です。Browser UI、React、Next.js、Docker、DBを含む代表テストは別の段階で追加します。
