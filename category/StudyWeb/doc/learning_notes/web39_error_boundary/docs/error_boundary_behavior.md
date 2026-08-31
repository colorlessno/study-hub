# 画面エラー時の表示と復旧

## 情報の分離

| 対象 | 表示・記録する内容 |
|---|---|
| 利用者 | 一部を表示できないこと、もう一度表示する操作 |
| 開発者 | 例外名、メッセージ、発生箇所などの調査情報 |

内部の例外詳細を利用者画面へそのまま表示せず、調査情報はログへ分離する。

## 現在のサンプル

- class componentの`ErrorBoundary`でパネル内だけを保護する
- `getDerivedStateFromError`で代替表示へ切り替える
- `componentDidCatch`で例外名、メッセージ、component stackをConsoleへ記録する
- 「もう一度表示する」で原因となるstateとBoundaryのstateを戻す
- 利用者向け画面には内部の例外情報を表示しない

Error Boundaryは子componentのrender等を保護できるが、event handler、非同期callback、サーバー側例外まで自動ですべて捕捉する仕組みではない。
