# Route設計

| Method | Path | 結果 |
|---|---|---|
| GET | `/items` | 一覧取得 |
| GET | `/items/{id}?include=source` | path parameterとquery stringを含む1件取得 |
| POST | `/items` | 作成 |
| POST | `/items`（nameなし） | 400 `name_required` |
| POST | `/items`（JSON不正） | 400 `invalid_json` |
| other | any | 404 |
