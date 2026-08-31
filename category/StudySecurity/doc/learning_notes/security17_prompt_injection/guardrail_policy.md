# ガードレール方針

参照文書を命令として扱わず、秘密情報要求や指示上書き風の入力は拒否または要確認に分類します。

pattern分類は観察用の一層にすぎません。productionではmodelへ実secretを渡さず、toolを最小権限にし、output schema、操作前authorization、human approvalを組み合わせます。

## 入力境界

- system指示はアプリケーション側が管理する信頼済み方針として、user入力と別の値で保持する。
- user入力と検索文書は`untrusted_data`として扱い、system指示へ連結して上書きしない。
- 防御方針の例は「秘密情報を開示しない」「外部操作を実行しない」であり、pattern分類の結果だけで権限を追加しない。

## 出力検証

この教材の出力は`decision`と`reason`だけを許可します。`answer/normal`、`review/instruction_override_pattern`、`reject/secret_request`の組以外、余分なキー、欠けたキーは無効です。実運用ではこの形式検証に加え、外部操作の対象、引数、権限、承認状態を操作直前に検証します。
