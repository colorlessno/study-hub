# security18 RAG安全対策 基本設計

## 0. 関連要件

- `../requirements/security18_rag_safety_requirements.md`

## 1. 設計目的

retrieved documentの本文・source・trust区分を分け、文書内命令とaccess controlを混同しない流れを確認する。

## 2. 成果物構成

```text
src/backend/src/studysecurity/systems/security18_rag_safety/
  package.json
  public/index.html
  public/app.js
  app/server.js
  app/demo.js
  samples/documents.json
doc/learning_notes/security18_rag_safety/
  README.md
  rag_trust_boundary.md
```

## 3. trust policy

| trust | action |
|---|---|
| trusted | source label付き引用候補 |
| untrusted | 文書内命令を無視し、内容をreview |
| restricted | access承認まで利用しない |

## 4. 処理方針

1. local配列から単純な部分一致で文書を検索する。
2. source ID、trust、本文、actionを一緒に返す。
3. trust区分に応じたactionを明示する。
4. CLI demoとlocal画面で3区分を比較する。

## 5. 安全制約

- 文書内の命令を実行しない。
- restricted文書は検索結果へ出たことを閲覧許可と扱わない。
- trust label・citationだけで正しさを保証しない。

## 6. 確認観点

- source provenance、authorization、content trustの違い
- indirect Prompt Injectionがretrieval経由で入ること
- productionでは取得前filterと回答前filterの両方が必要なこと
