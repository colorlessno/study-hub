# StudyAI system17-system36 基本設計インデックス

## 目的

`system17` から `system36` までの基本設計を一覧化し、StudyAI の共通アプリ構造で後続の詳細設計と製造へ進める。

## 共通構造

```text
category/StudyAI/
  src/backend/src/studyai/systems/systemXX/
  src/frontend/src/pages/SystemXXPage.tsx
  src/scripts/systemXX_*.py
  backend/tests/systems/systemXX/
```

## 共通方針

- 既存の `system01` から `system16` は変更しない。
- v3 追加の企業AIシステムパターン `system37` 以降とは異なる。
- Docker に入れられる実装は、詳細設計と製造で実行口を定義する。
- LM Studio 本体は Docker 化せず、既存の `system01` から `system16` と同じくローカル LM Studio を `host.docker.internal` 経由で利用する。
- 作成・更新するテストファイルは UTF-8 BOMなしとする。
- 外部AI APIが使えない場合も、モックまたはサンプルデータで学習できる構造にする。

## 一覧

| No | ファイル | タイトル | Backend配置 | Frontend配置 |
|---|---|---|---|---|
| system17 | `system17_basic_design.md` | Tokenizer観察 | `src/backend/src/studyai/systems/system17/` | `src/frontend/src/pages/System17Page.tsx` |
| system18 | `system18_basic_design.md` | Embedding類似検索ミニ実験 | `src/backend/src/studyai/systems/system18/` | `src/frontend/src/pages/System18Page.tsx` |
| system19 | `system19_basic_design.md` | Attentionデモ | `src/backend/src/studyai/systems/system19/` | `src/frontend/src/pages/System19Page.tsx` |
| system20 | `system20_basic_design.md` | Context Window実験 | `src/backend/src/studyai/systems/system20/` | `src/frontend/src/pages/System20Page.tsx` |
| system21 | `system21_basic_design.md` | Temperature比較 | `src/backend/src/studyai/systems/system21/` | `src/frontend/src/pages/System21Page.tsx` |
| system22 | `system22_basic_design.md` | RAG chunkサイズ比較 | `src/backend/src/studyai/systems/system22/` | `src/frontend/src/pages/System22Page.tsx` |
| system23 | `system23_basic_design.md` | Reranker比較 | `src/backend/src/studyai/systems/system23/` | `src/frontend/src/pages/System23Page.tsx` |
| system24 | `system24_basic_design.md` | 複数モデル比較 | `src/backend/src/studyai/systems/system24/` | `src/frontend/src/pages/System24Page.tsx` |
| system25 | `system25_basic_design.md` | max_tokens / temperature比較 | `src/backend/src/studyai/systems/system25/` | `src/frontend/src/pages/System25Page.tsx` |
| system26 | `system26_basic_design.md` | quantization比較 | `src/backend/src/studyai/systems/system26/` | `src/frontend/src/pages/System26Page.tsx` |
| system27 | `system27_basic_design.md` | 画像サイズとVLM精度比較 | `src/backend/src/studyai/systems/system27/` | `src/frontend/src/pages/System27Page.tsx` |
| system28 | `system28_basic_design.md` | OCR結果の正規化 | `src/backend/src/studyai/systems/system28/` | `src/frontend/src/pages/System28Page.tsx` |
| system29 | `system29_basic_design.md` | chunk metadata設計 | `src/backend/src/studyai/systems/system29/` | `src/frontend/src/pages/System29Page.tsx` |
| system30 | `system30_basic_design.md` | 重複文書の検出 | `src/backend/src/studyai/systems/system30/` | `src/frontend/src/pages/System30Page.tsx` |
| system31 | `system31_basic_design.md` | 評価用ground truth作成 | `src/backend/src/studyai/systems/system31/` | `src/frontend/src/pages/System31Page.tsx` |
| system32 | `system32_basic_design.md` | RAG評価セット | `src/backend/src/studyai/systems/system32/` | `src/frontend/src/pages/System32Page.tsx` |
| system33 | `system33_basic_design.md` | 検索評価 | `src/backend/src/studyai/systems/system33/` | `src/frontend/src/pages/System33Page.tsx` |
| system34 | `system34_basic_design.md` | 回答評価 | `src/backend/src/studyai/systems/system34/` | `src/frontend/src/pages/System34Page.tsx` |
| system35 | `system35_basic_design.md` | Prompt A/B比較 | `src/backend/src/studyai/systems/system35/` | `src/frontend/src/pages/System35Page.tsx` |
| system36 | `system36_basic_design.md` | Trace保存 | `src/backend/src/studyai/systems/system36/` | `src/frontend/src/pages/System36Page.tsx` |

## 詳細設計で具体化すること

- request / response schema
- service / repository / storage の責務
- モックAIと実AIの切り替え設定
- Docker 実行方針
- 検証コマンドと受入確認手順
