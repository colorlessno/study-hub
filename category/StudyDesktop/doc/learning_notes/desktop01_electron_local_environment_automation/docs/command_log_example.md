# コマンドlog例

```json
{"runId":"550e8400-e29b-41d4-a716-446655440000","type":"queued","level":"info","message":"Queued mock-failure","timestamp":"2026-08-31T00:00:00.000Z"}
{"runId":"550e8400-e29b-41d4-a716-446655440000","type":"running","level":"info","message":"Started mock-failure","timestamp":"2026-08-31T00:00:00.010Z"}
{"runId":"550e8400-e29b-41d4-a716-446655440000","type":"stderr","level":"warn","message":"mock failure requested","timestamp":"2026-08-31T00:00:00.100Z"}
{"runId":"550e8400-e29b-41d4-a716-446655440000","type":"cleaning","level":"warn","message":"Cleaning failed run","timestamp":"2026-08-31T00:00:00.110Z"}
{"runId":"550e8400-e29b-41d4-a716-446655440000","type":"failed","level":"error","message":"mock-failure exited with 1; cleanup={\"cleaned\":true,\"path\":\"550e8400-e29b-41d4-a716-446655440000\"}","timestamp":"2026-08-31T00:00:00.120Z"}
```

このlogは、アプリが何を実行すると決めたかと、失敗後の後片付け結果を時系列で表示する。rendererはcommandを渡せないため、renderer由来のshell commandは記録されない。
