# security16 依存関係管理 要件定義

## 1. 目的

脆弱性reportを、重大度だけでなく到達可能性、修正有無、互換性影響を含む対応判断へ変換する流れを学ぶ。

## 2. 学習対象

- vulnerability report
- severityとremediation
- direct・transitive dependency
- lockfileと更新確認

## 3. 作成する成果物

- 架空の監査report JSON
- report parser
- 重大度別summaryと対応候補
- remediation policy

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | `vulnerabilities`配列を検証して読み込める |
| FR-02 | package、severity、修正可否、noteを抽出できる |
| FR-03 | severity順に対応候補を並べられる |
| FR-04 | severity別件数をsummaryとして出力できる |
| FR-05 | 修正可能なら`update`、未提供なら`review`と分類できる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | 外部registryへ接続しない |
| NFR-02 | sampleは架空packageだけを使う |
| NFR-03 | 自動更新が常に安全とは説明しない |

## 6. 対象外

- 実projectへのpackage update
- SBOM生成
- registryやadvisory databaseとの連携

## 7. 受入条件

- sampleからseverity別summaryと対応候補を生成できる
- reportの発見と修正判断を区別できる
- update後にtestと互換性確認が必要と説明できる

## 8. 学習観点

- severityは優先順位の入力の一つであり結論ではない
- transitive dependencyは更新元packageとの関係を確認する
- 保留にも理由、期限、ownerを残す
