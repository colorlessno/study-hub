# StudyAI system17-system36 要件定義インデックス

## 目的
AI の中身、評価、データ品質、モデル選定、観測性を小さな学習単位へ分割し、後続の基本設計、詳細設計、製造へ進めるための要件定義一覧とする。

## 共通方針
- 既存 `system01` から `system16` は変更しない。
- v3 追加分の企業AIシステムパターンは `system37` 以降で扱い、本インデックスでは扱わない。
- 各 system はローカル実行できる最小サンプルを前提にする。
- Docker に入れられる実装は、製造工程で `Dockerfile` または `docker-compose.yml` を用意する。
- 作成・更新するテキストファイルは UTF-8 BOMなしを原則とする。

## 一覧
| No | ファイル | テーマ | 目的 |
|---|---|---|---|
| system17 | `system17_requirements.md` | Tokenizer観察 | 同じ文章でも言語、記号、空白、表記ゆれによって token 数が変わることを観察し、LLM 入出力コストと context 制約を見積もる土台を作る。 |
| system18 | `system18_requirements.md` | Embedding類似検索ミニ実験 | 文章を embedding に変換し、意味の近さを数値と検索順位で確認する。RAG の検索品質を理解する前段にする。 |
| system19 | `system19_requirements.md` | Attentionデモ | Transformer の attention を業務利用者向けに直感的に説明できるよう、単語間の参照関係を簡易可視化する。 |
| system20 | `system20_requirements.md` | Context Window実験 | LLM に渡せる文脈量には上限があり、長文入力では重要情報が欠落・希釈されることを実験で確認する。 |
| system21 | `system21_requirements.md` | Temperature比較 | temperature が出力のばらつき、創造性、再現性へ与える影響を比較し、業務システムでの設定判断を学ぶ。 |
| system22 | `system22_requirements.md` | RAG chunkサイズ比較 | chunk サイズと overlap が検索精度、根拠の読みやすさ、回答品質へ与える影響を比較する。 |
| system23 | `system23_requirements.md` | Reranker比較 | ベクトル検索の上位候補を reranker で並べ替え、検索結果の改善とコスト増を比較する。 |
| system24 | `system24_requirements.md` | 複数モデル比較 | 同じタスクを複数モデルで実行し、品質、速度、コスト、運用制約の違いを比較する。 |
| system25 | `system25_requirements.md` | max_tokens / temperature比較 | 出力長と生成のばらつきを制御し、コスト、途中切れ、再現性の関係を理解する。 |
| system26 | `system26_requirements.md` | quantization比較 | 量子化モデルの速度、メモリ使用量、回答品質の違いを比較し、ローカルAI環境の現実的な選定基準を作る。 |
| system27 | `system27_requirements.md` | 画像サイズとVLM精度比較 | 画像サイズ、解像度、圧縮が VLM の読み取り精度へ与える影響を比較する。 |
| system28 | `system28_requirements.md` | OCR結果の正規化 | OCR の誤認識や表記ゆれを正規化し、AI に渡す前のデータ品質を改善する。 |
| system29 | `system29_requirements.md` | chunk metadata設計 | RAG の根拠追跡、権限制御、評価に使える metadata を設計する。 |
| system30 | `system30_requirements.md` | 重複文書の検出 | 重複・類似文書が RAG 検索品質を下げることを確認し、登録前チェックの必要性を学ぶ。 |
| system31 | `system31_requirements.md` | 評価用ground truth作成 | AI評価の基準となる質問、正解、根拠、評価観点を作成し、主観評価から脱却する。 |
| system32 | `system32_requirements.md` | RAG評価セット | RAG の検索と回答を継続比較できる評価セットを作る。 |
| system33 | `system33_requirements.md` | 検索評価 | top-k、recall、hit rate などを使い、検索部分だけの品質を評価する。 |
| system34 | `system34_requirements.md` | 回答評価 | AI回答の正確性、根拠性、網羅性、不要情報の有無を評価する。 |
| system35 | `system35_requirements.md` | Prompt A/B比較 | プロンプト変更の効果を同一評価セットで比較し、改善を測定可能にする。 |
| system36 | `system36_requirements.md` | Trace保存 | AI処理の入力、検索結果、モデル設定、出力、評価を保存し、再現性と監査性を確保する。 |

## 後続工程で確認すること
- 基本設計では、各 system の入力、処理、出力、保存形式、UIまたはCLI境界を揃える。
- 詳細設計では、評価指標、サンプルデータ、例外処理、Docker 実行入口を揃える。
- 製造では、README、実行手順、確認コマンド、必要に応じた Dockerfile を作る。