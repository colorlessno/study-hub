# 監査イベント

- `actor`: 操作者。
- `action`: 操作名。
- `target`: 対象。
- `result`: 成功または失敗。
- `reason`: 判断理由。秘密情報やPIIは伏せる。
- `requestId`: 追跡ID。

successだけでなくdeniedやfailedも残します。実秘密情報、password、token、request body全体は記録せず、必要な識別子も保持期間と閲覧権限を定めます。
