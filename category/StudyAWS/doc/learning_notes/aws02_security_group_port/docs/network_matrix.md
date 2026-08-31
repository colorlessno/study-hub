# 通信マトリクス

| From | To | Port | 公開 | AWSでの考え方 |
|---|---|---:|---|---|
| Host | Web | 43102 → 4102 | yes | 実AWSではHTTP/HTTPSだけ公開 |
| Web | API | 5102 | no | WebのSGからのみ許可 |
| API | DB | 5432 | no | APIのSGからのみ許可 |
| Internet | API | 5102 | no | 直接公開しない |
| Internet | DB | 5432 | no | 外部公開しない |
