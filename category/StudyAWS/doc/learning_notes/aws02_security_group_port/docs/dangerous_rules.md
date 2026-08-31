# 危険設定

- DBを`0.0.0.0/0`へ公開する。
- SSHを常時全公開にする。
- 管理用portと利用者向けportを分けない。

## 修正例

- WebのHTTP/HTTPSだけを利用者へ公開する。
- APIはWebのSecurity Groupから、DBはAPIのSecurity Groupからだけ許可する。
- SSHが必要な場合は送信元を限定し、作業後に規則を削除する。可能ならSession Managerを使う。
