# StudyWeb web32〜web51 詳細設計一覧

作成日: 2026-04-29

## 目的

`web32`〜`web51`の基本設計と詳細設計を対応付け、各テーマの実装対象、API、画面、確認手順を探しやすくする。

## 対象テーブル

| No. | 基本設計 | 詳細設計 |
|---|---|---|
| web32 | [基本設計](../basic_design/web32_basic_design.md) | [詳細設計](web32_detailed_design.md) |
| web33 | [基本設計](../basic_design/web33_basic_design.md) | [詳細設計](web33_detailed_design.md) |
| web34 | [基本設計](../basic_design/web34_basic_design.md) | [詳細設計](web34_detailed_design.md) |
| web35 | [基本設計](../basic_design/web35_basic_design.md) | [詳細設計](web35_detailed_design.md) |
| web36 | [基本設計](../basic_design/web36_basic_design.md) | [詳細設計](web36_detailed_design.md) |
| web37 | [基本設計](../basic_design/web37_basic_design.md) | [詳細設計](web37_detailed_design.md) |
| web38 | [基本設計](../basic_design/web38_basic_design.md) | [詳細設計](web38_detailed_design.md) |
| web39 | [基本設計](../basic_design/web39_basic_design.md) | [詳細設計](web39_detailed_design.md) |
| web40 | [基本設計](../basic_design/web40_basic_design.md) | [詳細設計](web40_detailed_design.md) |
| web41 | [基本設計](../basic_design/web41_basic_design.md) | [詳細設計](web41_detailed_design.md) |
| web42 | [基本設計](../basic_design/web42_basic_design.md) | [詳細設計](web42_detailed_design.md) |
| web43 | [基本設計](../basic_design/web43_basic_design.md) | [詳細設計](web43_detailed_design.md) |
| web44 | [基本設計](../basic_design/web44_basic_design.md) | [詳細設計](web44_detailed_design.md) |
| web45 | [基本設計](../basic_design/web45_basic_design.md) | [詳細設計](web45_detailed_design.md) |
| web46 | [基本設計](../basic_design/web46_basic_design.md) | [詳細設計](web46_detailed_design.md) |
| web47 | [基本設計](../basic_design/web47_basic_design.md) | [詳細設計](web47_detailed_design.md) |
| web48 | [基本設計](../basic_design/web48_basic_design.md) | [詳細設計](web48_detailed_design.md) |
| web49 | [基本設計](../basic_design/web49_basic_design.md) | [詳細設計](web49_detailed_design.md) |
| web50 | [基本設計](../basic_design/web50_basic_design.md) | [詳細設計](web50_detailed_design.md) |
| web51 | [基本設計](../basic_design/web51_basic_design.md) | [詳細設計](web51_detailed_design.md) |

## 成果物の配置方針

各テーマの実装形態に応じ、成果物を次の場所へ配置する。

| 成果物 | 配置先 |
|---|---|
| バックエンド実装 | `src/backend/src/studyweb/systems/` |
| フロントエンド実装 | `src/frontend/src/studyweb/systems/` |
| 静的フロントエンド | `src/frontend/static/studyweb/systems/` |
| 学習手順・確認記録 | `doc/learning_notes/` |

Docker化するNode.jsサンプルは`node:20-alpine`、静的HTMLサンプルは`nginx:1.27-alpine`を基本イメージとする。個別テーマの要件が異なる場合は、各詳細設計を優先する。

## 使い方

1. 学習したい番号の基本設計で目的と全体構成を確認する。
2. 対応する詳細設計でファイル、処理、確認項目を確認する。
3. 実装と`doc/learning_notes/`を開き、動作確認と故障演習を行う。
