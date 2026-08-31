# StudyAI system17-system36 詳細設計インデックス

## 目的

`system17` から `system36` までの詳細設計を一覧化し、製造工程で必要な実装配置、schema、保存形式、Docker・ローカル実行窓口を固定する。

## 共通配置

```text
backend/src/studyai/systems/ai_learning/
frontend/src/pages/SystemXXPage.tsx
scripts/systemXX_demo.py
backend/tests/systems/systemXX/
```

## 共通方針

- 既存の `system01` から `system16` は変更しない。
- トップレベルの番号別実装フォルダは作らず、StudyAI 型の共通アプリ構成へ統合する。
- `system17` から `system36` は小さいAI評価教材が多いため、物理実装は `src/backend/src/studyai/systems/ai_learning/` に集約し、API prefix と画面 route で `/api/systemXX`、`/systemXX` として分離する。
- 外部AI APIが使えない場合は、モックまたはサンプルデータで同一 schema の結果を返す。
- LM Studio 本体は Docker に入れない。`system01` から `system16` と同じく、Docker コンテナからは `.env.docker` の `LM_STUDIO_BASE_URL=http://host.docker.internal:5858/v1` を通してローカル LM Studio API を呼ぶ。
- 商用APIで代替する場合は、共通 `studyai.common.ai` client の `AI_PROVIDER=commercial` または `AI_PROVIDER=custom` を使い、OpenAI互換の chat / embeddings endpoint、APIキー、モデル名を環境変数で持つ。
- Docker 実行窓口は定義し、build / run の実施有無は製造工程の検証記録へ残す。
- 作成・更新するテキストファイルは UTF-8 BOMなしとする。

## 一覧

| No | ファイル | タイトル | 保存先 | 検証コマンド |
|---|---|---|---|---|
| system17 | `system17_detailed_design.md` | Tokenizer観察 | `system17_runs` | `python -m pytest backend/tests/systems/system17` |
| system18 | `system18_detailed_design.md` | Embedding類似検索ミニ実験 | `system18_documents, system18_search_runs` | `python -m pytest backend/tests/systems/system18` |
| system19 | `system19_detailed_design.md` | Attentionデモ | `system19_runs` | `python -m pytest backend/tests/systems/system19` |
| system20 | `system20_detailed_design.md` | Context Window実験 | `system20_runs` | `python -m pytest backend/tests/systems/system20` |
| system21 | `system21_detailed_design.md` | Temperature比較 | `system21_runs, system21_outputs` | `python -m pytest backend/tests/systems/system21` |
| system22 | `system22_detailed_design.md` | RAG chunkサイズ比較 | `system22_chunk_configs, system22_runs` | `python -m pytest backend/tests/systems/system22` |
| system23 | `system23_detailed_design.md` | Reranker比較 | `system23_runs` | `python -m pytest backend/tests/systems/system23` |
| system24 | `system24_detailed_design.md` | 複数モデル比較 | `system24_runs, system24_model_scores` | `python -m pytest backend/tests/systems/system24` |
| system25 | `system25_detailed_design.md` | max_tokens / temperature比較 | `system25_runs` | `python -m pytest backend/tests/systems/system25` |
| system26 | `system26_detailed_design.md` | quantization比較 | `system26_runs` | `python -m pytest backend/tests/systems/system26` |
| system27 | `system27_detailed_design.md` | 画像サイズとVLM精度比較 | `system27_runs, system27_image_results` | `python -m pytest backend/tests/systems/system27` |
| system28 | `system28_detailed_design.md` | OCR結果の正規化 | `system28_runs` | `python -m pytest backend/tests/systems/system28` |
| system29 | `system29_detailed_design.md` | chunk metadata設計 | `system29_chunks, system29_metadata` | `python -m pytest backend/tests/systems/system29` |
| system30 | `system30_detailed_design.md` | 重複文書の検出 | `system30_documents, system30_duplicate_groups` | `python -m pytest backend/tests/systems/system30` |
| system31 | `system31_detailed_design.md` | 評価用ground truth作成 | `system31_ground_truth_cases` | `python -m pytest backend/tests/systems/system31` |
| system32 | `system32_detailed_design.md` | RAG評価セット | `system32_eval_sets, system32_eval_runs` | `python -m pytest backend/tests/systems/system32` |
| system33 | `system33_detailed_design.md` | 検索評価 | `system33_retrieval_eval_runs` | `python -m pytest backend/tests/systems/system33` |
| system34 | `system34_detailed_design.md` | 回答評価 | `system34_answer_eval_runs` | `python -m pytest backend/tests/systems/system34` |
| system35 | `system35_detailed_design.md` | Prompt A/B比較 | `system35_prompt_experiments, system35_prompt_results` | `python -m pytest backend/tests/systems/system35` |
| system36 | `system36_detailed_design.md` | Trace保存 | `system36_ai_traces` | `python -m pytest backend/tests/systems/system36` |

## 製造工程で確認すること

- `src/backend/src/studyai/systems/systemXX/` の service / schema / repository を作る。
- 製造時に共通実装を集約する場合は、`backend/src/studyai/systems/ai_learning/` に catalog / service / router を置き、system別の差分を catalog で管理する。
- `src/frontend/src/pages/SystemXXPage.tsx` を追加する。
- ルーティング、API prefix、Docker compose 連携に不整合がないことを確認する。
- 実AIを使わずに動く demo と test を先に成立させる。
