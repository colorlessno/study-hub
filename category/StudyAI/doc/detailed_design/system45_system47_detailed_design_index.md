# StudyAI system45-system47 詳細設計インデックス

## 目的

`system45`〜`system47` の基本設計を、教材実装と学習メモへ渡せる具体設計へ落とす。

## 共通方針

- 外部AI APIなしでも学べるように、固定入力、sample、mock、fixture、SQLを使う。
- AI判断と決定的検証を分ける。
- secrets、token、password、個人情報、実顧客情報を教材データに含めない。
- 作成・更新するテキストファイルは UTF-8 BOM なしとする。

## 一覧

| No | 詳細設計 | テーマ | 主な製造対象 |
| --- | --- | --- | --- |
| system45 | `system45_detailed_design.md` | Agent skill packaging | sample skill、contract、reference、script、failure pattern |
| system46 | `system46_detailed_design.md` | AI harness engineering | fixture、check、approval boundary、run log |
| system47 | `system47_detailed_design.md` | Sales data analysis AI / BI explanation | sales sample、SQL集計、AI説明入力、read-only境界 |

## 工程記録

- 2026-05-07 に `system45`〜`system47` の初期実装・学習メモを作成した。
