# RDSメモ

| 観点 | ローカル教材 | 実RDSで確認する内容 |
|---|---|---|
| 接続先 | Compose service名`db`またはloopback | endpoint、port、database名 |
| 通信元 | Compose内部または`127.0.0.1` | private subnet、接続元Security Group、public access無効 |
| 認証情報 | 教材専用のダミー値 | Secrets Manager等から実行時に取得し、Gitへ保存しない |
| backup | 停止時にvolumeを削除する演習環境 | 自動backupの保持期間、手動snapshot、復元試験 |
| 可用性 | 単一のローカルcontainer | Multi-AZ、failover、復旧時間 |
| 保守 | 手動でimageを更新 | maintenance window、engine version、適用時の停止影響 |
| 終了 | aws04専用containerとvolumeを削除 | instance停止・削除、snapshot保持、継続課金の有無 |

実RDSを作る場合は、作成前に料金、削除手順、snapshotの扱いを決めます。接続確認後はpublic access、Security Group、backup、maintenance window、Multi-AZを記録します。
