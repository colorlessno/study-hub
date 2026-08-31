# aws02 Security Group / port 要件定義

## 1. 目的

クラウド上の通信許可を、ポート、送信元、宛先、プロトコルの観点で切り分けられるようにする。

## 2. 学習対象

- Security Groupのinbound / outbound
- TCP port、HTTP、HTTPS、SSH
- 0.0.0.0/0の危険性
- アプリ、DB、管理接続の分離
- ローカルDocker環境でのポート公開との比較

## 3. 要件

- Web/API/DBの3層を題材に、公開してよい通信と閉じる通信を整理する。
- SSHを常時全公開にしない設計を学ぶ。
- ローカルDocker Composeのport mappingとSecurity Groupの違いを説明できるようにする。
- 実AWS操作は任意の発展課題とし、まずは設計表を作る。

## 4. 成果物

- 通信許可マトリクス
- ポート一覧
- 危険設定例と修正例
- 接続できない時の確認手順

## 5. 完了条件

- Web、API、DB、SSHの公開範囲を説明できる。
- port mappingとSecurity Groupの違いを説明できる。
- 接続不可時に確認する順序を説明できる。
