# StudyAI system45-system47 要件定義インデックス

## 目的

PDF元データから抽出した AI エージェント活用、skill、harness、BI説明の追加候補を、後続工程へ進められる要件定義一覧として整理する。

## 共通方針

- 既存 `system01` から `system44` は変更しない。
- 各 system は、外部AI APIなしでも sample、mock、fixture、SQL、check script で学習できる構成を優先する。
- secrets、token、password、個人情報、実顧客情報を教材データに含めない。
- 作成・更新するテキストファイルは UTF-8 BOM なしを原則とする。

## 一覧

| No | ファイル | テーマ | 目的 |
| --- | --- | --- | --- |
| system45 | `system45_agent_skill_packaging_requirements.md` | Agent skill packaging | AIエージェントが再利用できる skill を、指示、参照資料、補助スクリプト、入出力契約として整理する。 |
| system46 | `system46_requirements.md` | AI harness engineering | AIが安定して作業できる環境、入力、検証、権限、フィードバックを設計する。 |
| system47 | `system47_requirements.md` | Sales data analysis AI / BI explanation | SQL/BIによる正確な集計と、AIによる傾向説明・仮説提示の役割分担を学ぶ。 |

## 工程記録

- 2026-05-07 に `system45`〜`system47` の基本設計を作成した。
- 2026-05-07 に `system45`〜`system47` の詳細設計を作成した。
- 2026-05-07 に `system45`〜`system47` の初期実装・学習メモを作成した。
- 製造では、外部AIなしで動く最小MVPを優先する。
