# aws04 RDS接続 要件定義

## 1. 目的

マネージドDBとアプリ接続の基本を、ローカルPostgreSQLで疑似確認してからRDSの設計観点へつなげる。

## 2. 学習対象

- RDSとローカルDBの違い
- endpoint、port、database、user、password
- 接続文字列と環境変数
- backup、maintenance window、multi-AZの入口
- DBをpublicにしない設計

## 3. 要件

- ローカルではDocker ComposeのPostgreSQLをRDS相当として扱う。
- アプリから環境変数でDB接続し、接続成功と失敗を確認できる。
- 実DBパスワードは置かず、`.env.example`にはダミー値だけを置く。
- 実AWS RDSは発展課題として、作成、接続、停止、削除、課金注意を分ける。

## 4. 成果物

- RDS概念メモ
- ローカルDB接続サンプル要件
- 接続失敗時チェックリスト
- バックアップと復旧観点メモ

## 5. 完了条件

- アプリ接続情報を環境変数へ分離できる。
- DB公開範囲を説明できる。
- RDSを使う理由とローカルDBとの差を説明できる。
