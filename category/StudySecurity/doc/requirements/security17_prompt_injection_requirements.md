# security17 Prompt Injection体験 要件定義

## 1. 目的

ユーザー入力でAIへの指示が上書きされるPrompt Injectionを体験し、防御の基本を学ぶ。

## 2. 学習対象

- Prompt Injection
- system instruction
- user input separation
- allowlist
- output validation

## 3. 作成する成果物

- Prompt Injectionサンプル
- 危険入力例
- 防御プロンプト例
- 出力検証メモ

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | 指示上書き入力例を確認できる |
| FR-02 | ユーザー入力とシステム指示を分けて扱える |
| FR-03 | 出力形式を検証できる |
| FR-04 | 危険な要求を拒否する方針を確認できる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | 実APIキーを使わない疑似サンプルでも学習可能にする |
| NFR-02 | 防御策を過信しない説明を含める |
| NFR-03 | ログに機密情報を出さない |

## 6. 対象外

- 本番LLM gateway
- jailbreak網羅
- モデル評価の深掘り

## 7. 受入条件

- Prompt Injectionの基本を説明できる
- 入力分離と出力検証の必要性を説明できる
- AI出力を無条件に信用しない理由を説明できる

## 8. 学習観点

- AIへの入力も攻撃面になる
- promptだけで完全防御はできない
- 後段の検証と権限制限が必要
