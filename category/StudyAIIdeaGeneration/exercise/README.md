# 制約変更による発想結果の比較演習

## 目的

同じテーマでも、予算・期間・利用可能な技術を変えると、発想材料と上位案がどう変化するかを観察する。LLMの出力を眺めるだけでなく、入力、期待する変化、観察結果、説明を1回の演習として残す。

## 入力

| 入力 | 条件 |
|------|------|
| `baseline_input.json` | 予算3万円、8週間、Python初級を利用可能 |
| `variant_input.json` | 予算0円、2週間、no-codeと既存ツールだけを利用 |

テーマ、背景、目的は同じにし、制約だけを変更している。

## 期待する変化

- 出力JSONのschemaと件数は変わらない。
- variantでは有料サービス、独自開発、長期準備を前提にする案が減る。
- variantでは既存ツールの組み合わせ、手作業での小規模検証、短期間の試行が増える。
- LLM出力には揺れがあるため、案名の完全一致ではなく制約への適合方向を比較する。

## 手順

1. API接続なしで両方の入力を確認する。

```cmd
python verify\verify_prompts.py --check-only --input exercise\baseline_input.json
python verify\verify_prompts.py --check-only --input exercise\variant_input.json
```

2. 生成前に `comparison_template.md` の「予想」を記入する。
3. LM Studioを利用できる場合は、モデルをロードしてLocal Serverを開始し、生成なしの接続確認を行う。portが5858の場合は次のように指定する。

```cmd
python verify\verify_prompts.py --connection-only --base-url http://localhost:5858/v1
```

4. 揺れを抑えるため同じmodel・temperatureで先頭2stepを実行する。既定port以外では、両方のコマンドへ同じ `--base-url` を追加する。

```cmd
python verify\verify_prompts.py --input exercise\baseline_input.json --steps mindmap,scamper --temperature 0.4
python verify\verify_prompts.py --input exercise\variant_input.json --steps mindmap,scamper --temperature 0.4
```

5. 各実行後に表示された `report.md` と `scamper_parsed.json` を比較する。
6. 制約に反する案、上位10案の重複数、低コスト・短期・no-codeを反映した案を数える。
7. `comparison_template.md` に観察と説明を記入する。

## 完了条件

- 入力変更前に結果の変化を予想した。
- schemaの安定性と内容の変化を分けて確認した。
- 制約を反映した案と反映していない案を具体例で説明できる。
- LLMの揺れと入力変更の影響を同一視していない。
