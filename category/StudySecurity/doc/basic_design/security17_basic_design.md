# security17 Prompt Injection対策 基本設計

## 0. 関連要件

- `../requirements/security17_prompt_injection_requirements.md`

## 1. 設計目的

入力内の命令上書き・secret要求を小さなruleで分類し、promptだけに依存しない防御層を考える。

## 2. 成果物構成

```text
src/backend/src/studysecurity/systems/security17_prompt_injection/
  package.json
  public/index.html
  public/app.js
  app/server.js
  app/demo.js
  samples/prompts.json
doc/learning_notes/security17_prompt_injection/
  README.md
  guardrail_policy.md
```

## 3. 判定

| 入力 | decision | reason |
|---|---|---|
| 通常の問い合わせ | answer | normal |
| 指示上書きpattern | review | instruction_override_pattern |
| secret要求 | reject | secret_request |

## 4. 処理方針

1. アプリケーション側のsystem指示とuser入力を別の値として保持する。
2. user入力を文字列として正規化する。
3. secret要求、命令上書きpattern、通常入力を分類する。
4. `decision`と`reason`のキー、許可値、組み合わせを検証する。
5. 入力境界、判定、形式検証結果を表示する。
6. CLI demoとlocal画面で同じ関数を確認する。

## 5. 安全制約

- 外部AI APIへ送信しない。
- rule一致を完全なPrompt Injection検出と扱わない。
- tool権限、output validation、承認を別の防御層として考える。

## 6. 確認観点

- 入力分類は攻撃者が迂回できること
- instruction hierarchyとdata boundaryの違い
- LLM出力を次の操作へ渡す前のschema・権限検証
