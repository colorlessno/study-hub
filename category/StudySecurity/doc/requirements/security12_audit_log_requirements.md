# security12 監査ログ 要件定義

## 1. 目的

重要操作について、誰が、何に、何を行い、どの結果になったかを追跡できる監査eventを学ぶ。

## 2. 学習対象

- actor、action、target、result
- reasonとrequest ID
- JSON Lines
- PIIとsecretのmask

## 3. 作成する成果物

- 監査event logger
- 成功・拒否eventのCLI demo
- event項目定義
- 本番保存で考慮する論点

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | actor、action、target、result、reason、requestIdを記録できる |
| FR-02 | 各eventへUTC timestampを付与できる |
| FR-03 | 1 eventを1行のJSONとして標準出力へ出せる |
| FR-04 | emailと学習用secretを全ての文字列項目でmaskできる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | 実個人情報・実秘密情報を扱わない |
| NFR-02 | 監査logをdebug logの代替として扱わない |
| NFR-03 | 本番では改ざん耐性、access制御、保持期間が別途必要と明記する |

## 6. 対象外

- SIEM連携
- 改ざん耐性storage
- 長期保持と検索基盤

## 7. 受入条件

- demo出力を1行ずつJSONとして読める
- 成功と拒否の両方をrequest IDで追跡できる
- emailとダミーsecretが平文で出力されない

## 8. 学習観点

- 監査logは事後調査と説明責任のためのevent記録である
- 失敗や拒否も重要な監査eventになる
- 調査可能性とdata最小化を両立させる
