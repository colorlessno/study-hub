# base12 詳細設計

## カタログ接続

base12は文書表示、起動不要として接続します。教材入口は次のファイルです。

```text
category/StudyBase/doc/learning_notes/base12_system_anatomy_walkthrough/README.md
```

StudyHubはこの文書を初期表示し、画面内の絶対パス`/themes/arch01?catalog=actual`を使ってarch01へ移動します。

## 関連ファイル

base12の教材欄から次のarch01ファイルを読み取れるようにします。ファイルをbase12側へコピーしません。

| 表示名 | 参照先 |
|---|---|
| arch01の説明 | arch01のREADME |
| arch01専用システムの整理例 | 画面、API、SQLite、ログで構成する注文登録システムの概要 |
| 構成要素の整理 | context、container、componentのひな形 |
| 処理とデータの流れ | requestとdata flowのひな形 |
| 失敗時の動き | failure modeのひな形 |
| 事実と推測 | evidenceとinferenceのひな形 |
| 構成判断 | decision noteのひな形 |

base12の要件定義、基本設計、詳細設計も教材欄から確認できるようにします。

## チェック項目

チェック設定の版は2とし、次の3点を別々に記録します。

- base12が案内入口であること
- arch01へ移動できること
- 学習本体と進捗の管理先がarch01であること

チェック項目には、arch01の演習完了を示す内容を含めません。

## 検証

- カタログ生成後のbase12名と教材入口を確認する
- base12が文書表示、起動不要であることを確認する
- READMEにarch01へのリンクが含まれることを確認する
- arch01の主要資料が関連ファイルAPIから取得できることを確認する
- base12の案内と関連ファイルに、別テーマをarch01の起動対象・保存先とする記載がないことを確認する
- チェック設定が版2、3項目であることを確認する
- StudyBase検証でbase12の案内文書とarch01の参照先が存在することを確認する

## エラー時の表示

案内文書を読み取れない場合はStudyHubの教材読込エラーを表示します。arch01へ移動できない場合は、案内文書に記載した分野一覧からの移動手順を使用します。
