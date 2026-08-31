# security18 RAG安全対策 詳細設計
## 0. 関連文書

- `../requirements/security18_rag_safety_requirements.md`
- `../basic_design/security18_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studysecurity/systems/security18_rag_safety/
  Dockerfile
  package.json
  public/index.html
  public/app.js
  app/server.js
  app/demo.js
  samples/documents.json
```

## 2. 主要設計
| 要素 | 内容 |
|---|---|
| 文書分類 | trusted, untrusted, restrictedを付与する |
| 検索結果 | 文書本文、出典、信頼区分を並べる |
| 応答方針 | untrusted文書内の命令は無視し、restricted文書は要確認にする |
| 引用 | 出典IDを必ず表示する |
| 実行 | CLI demoとport 4118のlocal画面で3区分を比較する |

## 3. 安全制約
- 悪意ある文書はローカルサンプルに限定する。
- 実個人情報や実秘密情報を含む文書は置かない。
- RAG検索結果を無条件に正しい情報として扱わない。
## 4. 確認手順
1. trusted文書の検索結果を確認する。
2. untrusted文書が注意付きで表示されることを確認する。
3. restricted文書が要確認になることを確認する。
4. 出典IDの表示を確認する。
## 5. 完了条件

- RAGにおける文書信頼度を説明できる。
- 出典表示とアクセス制御の違いを説明できる。
- 文書由来の攻撃に対する基本方針を説明できる。
