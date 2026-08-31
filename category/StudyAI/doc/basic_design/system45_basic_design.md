# system45 基本設計

## Agent skill packaging

## 0. 関連要件

- `../requirements/system45_requirements.md`

## 1. 設計目的

AIエージェントが再利用できる skill を、目的・入力・出力・制約・参照情報・補助スクリプト・失敗パターンに分けて設計できる教材にする。

## 2. 対象領域

- skill metadata
- instruction file
- references
- scripts / tools
- progressive disclosure
- input / output contract
- failure pattern

## 3. 成果物構造

```text
category/StudyAI/
  doc/learning_notes/system45_agent_skill_packaging/
    README.md
    docs/
      skill_contract.md
      reference_split.md
      failure_patterns.md
      skill_vs_tool_calling.md
  src/apps/system45_agent_skill_packaging/
    sample_skill/
      SKILL.md
      references/
        examples.md
        checklist.md
        missing_fields.md
        sensitive_input.md
      scripts/
        validate_input.js
```

StudyHubでは`category/StudyAI/src/apps/system45_agent_skill_packaging`を作業フォルダとし、`validate_input.js`へ3種類のMarkdown入力例を渡す単発コマンドとして実行する。

## 4. 入力

| 入力 | 内容 |
|---|---|
| skill目的 | 何を補助する skill か |
| 利用条件 | いつ読み込むか、いつ使わないか |
| 参照情報 | 長い説明、仕様、チェックリスト |
| script候補 | 決定的に処理できる小さい処理 |

## 5. 出力

| 出力 | 内容 |
|---|---|
| skill contract | 入力・出力・制約・失敗条件 |
| sample skill | `SKILL.md`、references、scripts の最小構造 |
| 失敗パターン表 | 入力不足、権限不足、危険操作時の対応 |

## 6. 処理方針

1. skillの目的と対象外を決める
2. instructionに置く内容とreferencesへ分離する内容を分ける
3. 決定的に処理できるscript候補として分け出す
4. 入出力契約と失敗条件を表にする
5. skillとtool callingの違いを学習メモに残す

## 7. StudyHub画面

| 領域 | 内容 |
|---|---|
| 操作 | 「正常な入力例を検証」「必須項目の不足を検出」「秘密情報を含む入力を拒否」の3操作を選ぶ |
| 実行結果 | `validate_input.js`の標準出力または標準エラーを表示する |
| 教材 | 技能定義、入力検証の処理、正常な入力例、入力確認表を切り替えて表示する |

- 3操作は`command-one-shot`で実行し、バックグラウンドプロセスを残さない。
- 必須項目不足と秘密情報の例は、検証処理が終了コード1を返す想定結果として画面に表示する。
- このテーマはskillの構成と入力検証を確認する教材であり、外部通信、DB、実行履歴の永続化は原仕様の対象外とする。

## 8. 確認観点

- skill定義に必要な項目を説明できるか
- 長い説明をreferencesへ分離する理由を説明できるか
- `sample_skill/scripts`へ分離する決定的処理と、skill本文へ残す判断・手順の違いを説明できるか

## 9. 後続工程への引き継ぎ

詳細設計では、`SKILL.md` の章立て、sample input/output、script例、失敗ケースを定義する。
