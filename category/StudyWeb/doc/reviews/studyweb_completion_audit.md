# StudyWeb 構造監査

## 1. 目的

StudyWebのweb01〜52について、要件・設計・学習入口・実装配置がtheme IDで追跡できることを確認し、「構造が揃っていること」と「すべてを実行・理解済みであること」を区別して記録する。

監査日: 2026-08-07

## 2. 結果

| 対象 | File数 | Unique theme ID | Missing ID | 判定 |
|---|---:|---:|---|---|
| requirements | 53 | 52 | なし | OK |
| basic design | 53 | 52 | なし | OK |
| detailed design | 53 | 52 | なし | OK |
| learning notes | 52 | 52 | なし | OK |
| sourceを持つtheme | 複数root | 48 | なし | OK |

requirements / basic design / detailed designが53 filesなのは、web32〜52のindex fileが各1件あり、web32 IDとして重複集計されるため。実theme IDはweb01〜52の52件すべて存在する。

## 3. 文書完結型と実装型

| 種別 | Theme | 期待する成果物 |
|---|---|---|
| 文書完結型 | web29、web30、web31、web52 | template、記録手順、比較・判断文書 |
| 実装型 | 上記以外の48 theme | `src/`配下のfrontend / backend / infra等 |

実装型48 IDはすべて`src/`配下に対応directoryがある。web19〜22、web26〜28等はfrontend、backend、infraに同じIDの複数directoryを持つ。

## 4. 学習グループ

| Theme | Group |
|---|---|
| web01〜06 | Browser foundations |
| web07〜12 | Frontend UI |
| web13〜18 | API and data |
| web19〜22 | Full-stack communication |
| web23〜28 | Modern runtime |
| web29〜31 | Learning operations |
| web32〜36 | HTTP and browser state |
| web37〜40 | Frontend workflows |
| web41〜45 | API and business rules |
| web46〜51 | Files, async, performance |
| web52 | Architecture selection capstone |

この分類は学習上の論理groupであり、source pathとtheme IDを変更しない。将来のStudy Hubでは、同じthemeを別group・tagからも参照できるようにする。

## 5. 自動検証

リポジトリrootで次を実行する。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate_portfolio.ps1
```

確認対象:

- text fileがstrict UTF-8として読めること
- Markdown linkの参照先が存在すること
- theme catalogの件数・関連文書
- Git管理対象に禁止されたprivate領域が入っていないこと

## 6. 既知の注意点

- StudyWeb内ではweb19〜22、web26〜28の`docker-compose.yml`に既存UTF-8 BOM warningがある。今回の監査では文字コード変換を行わない。
- themeによって実装の完成度は異なり、要件の一部だけを再現する概念sampleもある。
- static sampleでHTTP statusを文字列表示するだけの例と、実際にHTTP responseを返すAPIを区別する必要がある。
- 性能themeには疑似counter・SQL手順だけのものがあり、benchmark実績として扱わない。
- 外部service、Docker、DBが必要なthemeは、環境を用意して個別に再実行する。

## 7. この監査が保証しないこと

- 48実装を同じ日にすべて起動したこと
- requirementsの全項目がproduction品質で実装済みであること
- security、performance、accessibilityの本番適合性
- cloud・外部API・databaseの継続的な利用可能性
- 学習者が全themeを説明・改造できる状態であること

構造監査のOKを、学習完了やproduction readinessと表現しない。

## 8. 学習完了の記録方法

各themeは次の4段階を個別に記録する。

1. 再現できる
2. 説明できる
3. 改造できる
4. 応用できる

構造が存在するだけでは「理解済み」にしない。学習記録はrootの`LEARNING_LOG_TEMPLATE.md`を使い、最終学習日、観察結果、変更内容、次の行動を残す。

## 9. 学習への使い方

1. [web52](../learning_notes/web52_modern_rendering_comparison/README.md)で全体の構成判断を行う。
2. 代表themeを各groupから1件ずつ選び、実行・説明・改造を記録する。
3. [学習ログ](../../../../LEARNING_LOG_TEMPLATE.md)へ観察結果と次回の確認内容を残す。

## 10. 関連文書

- [StudyWeb README](../../README.md)
- [学習再開ガイド](../../../../LEARNING_GUIDE.md)
- [全theme catalog](../../../../THEME_CATALOG.md)
