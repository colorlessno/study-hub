# StudyHubカタログ

[`fields.json`](./fields.json)は、[`../category/`](../category/)配下の学習分野を扱う機械可読カタログです。[`fields.schema.json`](./fields.schema.json)で公開カタログの分野数、番号付きテーマ数、配置規則、検証方法を検査します。既存プロジェクトを管理画面へ依存させず、StudyHubとの安定した境界を提供します。

[`themes.json`](./themes.json)は、番号付き163テーマと番号を持たない独立教材4件の名称、教材入口、表示方法、実行方法を扱います。文書7件、静的Web 22件、単一Web処理19件、複合Web処理9件、共有Web処理43件、単一API処理27件、API・DB処理3件、単発コマンド22件、複合コマンド14件、外部アプリ1件の全167件を`connected`としています。

番号付き163テーマは、学習入口のREADMEに加えて、要件定義・基本設計・詳細設計をそれぞれ`requirements`、`basic-design`、`detailed-design`の教材として公開します。生成時に各テーマと正式文書を一対一で特定し、既存のソース、入力例、ひな形等の追加教材を維持したまま参照を統合します。番号体系外の独立教材4件は、各教材が元から持つ文書だけを公開します。

[`checklists/`](./checklists/)はテーマ別の学習項目を扱います。全167テーマを対象とし、各テーマの入口文書にある「学習完了の目安」「完了条件」「受入条件」「確認ポイント」等に対応する項目を`<themeId>_check.json`へ定義しています。

[`../scripts/generate-theme-checklists.mjs`](../scripts/generate-theme-checklists.mjs)は、未作成テーマの設定を入口文書から生成します。既存設定は通常上書きせず、`--force`を指定した場合だけ再生成します。

各分野では次を定義します。

- a stable ID, display name, directory, and learning entry file;
- the prefix used by every numbered theme in that field;
- the documentation root and one or more implementation roots used by theme-named directories;
- its numbered-theme count;
- a unit kind: `document`, `exercise`, `implementation`, `application`, `shared-environment`, or `mixed`;
- one bounded check command and timeout;
- whether the check manages a temporary shared environment and its cleanup;
- a start guide when the field is a manually operated application.

Lifecycle modes:

- `check-only`: verification runs and exits without a separately managed service;
- `managed-check`: verification starts and cleans up its own temporary dependencies;
- `manual-app`: automated checks are available, while interactive startup and shutdown follow the linked guide.

分野、全167テーマ、テーマ別学習項目、テーマグループ、番号の連続性、配置先、参照ファイル、単体利用方法の整合性を検証します。テーマの表示方法とライフサイクルから決まる起動種別も検査し、たとえば`request/stack`へ単一プロセス用の起動定義を割り当てる不整合を拒否します。生成検査では全167テーマの分野、分類、起動種別を生成元と比較し、個別操作、URL、コマンド、入力定義等の調整済み起動内容は維持します。番号付きテーマでは、`themeDirectories.documentationRoot`直下にテーマ文書が一対一で存在すること、`implementationRoots`直下のテーマ名付きフォルダーが登録済みテーマだけを参照することも検証します。テーマ名付きフォルダーは`<themeId>_<lower_snake_case>`へ統一します。バックエンド、フロントエンド、インフラなど複数層に同じテーマの実装を置く構成は、それぞれの配置ルートを明示して扱います。テーマ接頭辞を持たない`common`等の共有実装はテーマ重複として扱いません。

全テーマの入口文書は厳密なUTF-8として読み、内容が完全に重複する入口を拒否します。番号付き163テーマの要件定義・基本設計・詳細設計も厳密なUTF-8として読み、テーマごとに一つだけ存在し、カタログの正式文書参照と一致することを検証します。別テーマの入口文書を教材として参照する場合は、独立教材として扱わず`aliasOf`、`relatedFieldIds`、統合先の`entryFile`を明示した案内入口にします。現在の案内入口は`base12`から正規テーマ`arch01`への1件です。

単体利用に使うNode.js・Pythonスクリプト、npm script、Docker Compose定義、Electronの`package.json`も、各テーマの作業フォルダーを基準に実在を検証します。別分野の正規テーマへ統合した案内入口は、`aliasOf`と`relatedFieldIds`で統合先を明示します。

```console
node scripts/validate-study-catalog.mjs
node scripts/generate-theme-catalog.mjs --check
```

`THEME_CATALOG.md`を変更した場合は、次のコマンドでテーマカタログを再生成します。

```console
node scripts/generate-theme-catalog.mjs
```

List or run a field check:

```console
node scripts/run-study-check.mjs --list
node scripts/run-study-check.mjs --field StudyDevOps
```
