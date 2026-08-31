# security19 データ保持・削除 詳細設計
## 0. 関連文書

- `../requirements/security19_data_retention_requirements.md`
- `../basic_design/security19_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studysecurity/systems/security19_data_retention/
  Dockerfile
  package.json
  app/retention_policy.js
  app/demo.js
```

## 2. 主要設計
| 要素 | 内容 |
|---|---|
| データ種別 | 注文、問い合わせ、監査ログの保持期間を分ける |
| 判定 | 最終更新日、法的保留フラグで削除可否を判定する |
| 削除候補 | 削除対象リストを生成するだけにする |
| 監査 | 削除判断の理由を記録する |
| 安全側の失敗 | unknown type、不正日付、未来日付は削除候補にしない |

## 3. 安全制約
- 実ファイルや実DBの削除は行わない。
- 削除処理は候補表示とドライランに限定する。
- 法的保留や監査要件を無視しない。
## 4. 確認手順
1. サンプルデータから削除候補を生成する。
2. 保持期間内データが除外されることを確認する。
3. 法的保留フラグ付きデータが除外されることを確認する。
4. 不明種別、不正日付、未来日付が安全側で除外されることを確認する。
5. 判断理由を確認する。
## 5. 完了条件

- 保持期間と削除条件を説明できる。
- ドライランの重要性を説明できる。
- 削除判断の監査記録を説明できる。
