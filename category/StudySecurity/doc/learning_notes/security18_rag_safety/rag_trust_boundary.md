# RAG信頼境界

検索文書は回答材料であり、命令ではありません。信頼区分と出典を明示し、制限文書は要確認にします。

- source provenance: どこから、どのversionの文書を取得したか。
- content trust: 内容をどこまで信用してよいか。
- authorization: 現在の利用者が文書を取得・利用してよいか。

この3つは別の判断です。特にrestricted文書は、retrieval後に伏せるのではなく取得前のaccess filterで除外するのが基本です。
