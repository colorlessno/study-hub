# StudyAI system45-system47 基本設計インデックス

## 目的

`system45`〜`system47` の要件定義を、詳細設計と教材実装へ渡せる基本設計として整理する。

## 共通方針

- 外部AI APIなしでも学べるように、固定入力、sample、mock、fixture、SQLを使う。
- AI判断と決定的検証を分ける。
- secrets、token、password、個人情報、実顧客情報を教材データに含めない。
- 作成・更新するテキストファイルは UTF-8 BOM なしとする。

## 一覧

| No | 基本設計 | テーマ | 主な製造対象 |
| --- | --- | --- | --- |
| system45 | `system45_basic_design.md` | Agent skill packaging | skill構成、参照分離、script境界、失敗パターン |
| system46 | `system46_basic_design.md` | AI harness engineering | fixture、deterministic check、approval boundary、log |
| system47 | `system47_basic_design.md` | Sales data analysis AI / BI explanation | SQL集計、AI説明、read-only境界、分析メモ |

## 工程記録

- 2026-05-07 に `system45`〜`system47` の詳細設計を作成した。
- 2026-05-07 に `system45`〜`system47` の初期実装・学習メモを作成した。
