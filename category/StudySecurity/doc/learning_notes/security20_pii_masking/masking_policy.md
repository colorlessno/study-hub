# マスキング方針

- 元値をログに出さない。
- 種別ごとに置換文字列を変える。
- 正規表現では検出漏れと過剰マスキングが起きるため、限界を説明する。

maskは保存・送信・表示の各境界より前に行い、application logだけでなくAI trace、error report、evaluation dataも対象にします。復元が必要な場合は単純置換ではなく、access制御されたtokenizationを別途設計します。
