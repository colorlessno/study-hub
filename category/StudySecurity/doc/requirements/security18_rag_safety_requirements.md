# security18 RAG安全対策 要件定義

## 1. 目的

検索文書を信頼済み命令として扱わず、出典・信頼区分・access controlを分けて扱う基本を学ぶ。

## 2. 学習対象

- trusted、untrusted、restricted document
- indirect prompt injection
- source metadataとcitation
- retrievalとauthorizationの違い

## 3. 作成する成果物

- 3つの信頼区分を持つ架空文書
- local検索画面とCLI demo
- trust区分ごとの処理方針
- RAG trust boundaryの補足資料

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | queryに一致するlocal文書を表示できる |
| FR-02 | 各結果へsource IDとtrust区分を付けられる |
| FR-03 | trustedは引用候補、untrustedは指示を無視して内容確認、restrictedは承認待ちにできる |
| FR-04 | 空queryで3区分を比較できる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | 外部LLM、vector DB、外部文書へ接続しない |
| NFR-02 | 実個人情報・実秘密情報を含めない |
| NFR-03 | trust labelだけで安全が保証されるとは説明しない |

## 6. 対象外

- embedding・rankingの実装
- 文書level authorizationの実基盤
- LLMによる回答生成

## 7. 受入条件

- CLIと画面で3つのtrust区分とactionを確認できる
- 文書本文の命令とsystem instructionを区別できる
- citationとaccess controlの違いを説明できる

## 8. 学習観点

- 検索されたことは、閲覧・実行を許可されたことを意味しない
- untrusted文書はdataとして扱い、その中の命令を実行しない
- source、version、access decisionを追跡可能にする
