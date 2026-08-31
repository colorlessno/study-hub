# vector DB / RAG notes

Vector DBは類似検索を行うための保存先。RAGでは、回答の根拠となる文書IDやchunkを別途管理する必要がある。

注意点:

- embeddingは元文書の品質に依存する。
- 古い文書を更新したら再embeddingが必要。
- 類似検索結果をそのまま正解として扱わない。

