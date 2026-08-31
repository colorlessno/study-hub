# StudyAI system37-system44 要件定義インデックス

## 目的
v3で追加された企業AIシステムパターンを、要件定義、基本設計、詳細設計、製造へ進められる教材単位に整理する。

## 共通方針
- 既存 `system01` から `system36` は変更しない。
- `system17` から `system36` はAI基礎・評価・データ品質であり、本範囲では企業AIシステムの業務適用パターンを扱う。
- 実企業システムそのものの完全再現ではなく、業務実行、推薦、予測、検知、最適化、KPI評価の型を学ぶ教材として作る。
- LM Studio 本体は Docker 化せず、既存 `system01` から `system16` と同じくローカル起動し、Docker からは `host.docker.internal` 経由で接続する。
- 外部AI APIが使えない場合は、モックまたはサンプルデータで学習できる構成にする。
- 作成・更新するテキストファイルは UTF-8 BOMなしを原則とする。

## 一覧
| No | ファイル | テーマ | 元ネタ | 目的 |
|---|---|---|---|---|
| system37 | `system37_requirements.md` | 取引実行型AIコンシェルジュ | IndiGo 6Eskai | 利用者が答えを知らない状態から条件を聞き出し、候補比較、確定処理、変更取消まで進める業務実行型AIを学ぶ。 |
| system38 | `system38_requirements.md` | リアルタイム推薦・パーソナライズ | Netflix Personalized Recommendation | 行動ログ、ランキング、A/Bテスト、継続率改善まで含む推薦システムを学ぶ。 |
| system39 | `system39_requirements.md` | 業務実行型カスタマーサポートAI | Klarna AI assistant | FAQ回答だけで終わらず、本人確認、手続き、記録、エスカレーション、引継ぎまで扱うサポートAIを学ぶ。 |
| system40 | `system40_requirements.md` | 需要予測・在庫最適化AI | Walmart / Starbucks Inventory AI | 需要予測、在庫数、発注点、欠品リスク、補充提案、人間承認を組み合わせたAIを学ぶ。 |
| system41 | `system41_requirements.md` | コンピュータビジョン / マルチモーダルAI | Amazon Just Walk Out | 画像、OCR、VLM、センサー由来データを業務判断へ接続する現場AIを学ぶ。 |
| system42 | `system42_requirements.md` | 不正検知・異常検知AI | Mastercard Decision Intelligence | リアルタイムリスクスコア、false positive / false negative、監査ログを含む不正・異常検知AIを学ぶ。 |
| system43 | `system43_requirements.md` | 制約最適化AI | UPS ORION | 配送、担当者割当、シフト、設備利用などを対象に、制約条件、目的関数、実用解を学ぶ。 |
| system44 | `system44_requirements.md` | AI KPI / 実験評価ダッシュボード | Netflix Experimentation Platform | AIを作って終わりにせず、業務KPI、AI品質、コスト、レイテンシ、失敗分析、改善ループを評価する。 |

## 後続工程で確認すること
- 基本設計では、業務実行、承認、監査、評価の境界を明確にする。
- 詳細設計では、状態遷移、リスク判定、KPI、失敗時処理、Docker実行入口を定義する。
- 製造では、外部AIなしで動く最小MVPを先に成立させ、LM Studio連携は既存方式に合わせる。