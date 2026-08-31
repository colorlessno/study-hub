# rollback plan

1. migration前backupを確認する。
2. restore先または再作成schemaへ戻す。
3. `003_after_restore_check.sql` で件数と代表データを確認する。
4. migration後に作った変更が残っていないことを確認する。

