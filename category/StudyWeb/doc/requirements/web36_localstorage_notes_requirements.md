# web36 localStorage注意点 要件定義

## 1. 目的

localStorage の保存・読取・削除を体験し、保存してよい情報と危険な情報を区別する。

## 2. 学習対象

- localStorage
- sessionStorage
- DevTools Application タブ
- token保存リスク
- XSS時の漏洩リスク

## 3. 作成する成果物

- localStorage確認用画面
- 保存・読取・削除サンプル
- 保存してよい情報 / 悪い情報の整理表
- DevTools確認手順

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | localStorageへ値を保存できる |
| FR-02 | 保存値を画面に表示できる |
| FR-03 | 保存値を削除できる |
| FR-04 | DevToolsで保存値を確認できる |
| FR-05 | tokenや個人情報保存の危険性を説明できる |
| FR-06 | sessionStorageへ値を保存・表示・削除し、localStorageとの保存期間の違いを比較できる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | 学習用の最小画面にする |
| NFR-02 | 機密情報を実データとして保存しない |
| NFR-03 | セキュリティ深掘りは `StudySecurity` と接続する |

## 6. 対象外

- 本格認証実装
- 暗号化ストレージ
- IndexedDB

## 7. 受入条件

- localStorageの保存場所と寿命を説明できる
- sessionStorageが同じタブ内だけで維持されることを説明できる
- 保存してよい情報と危険な情報を区別できる
- XSS時に読まれるリスクを説明できる

## 8. 学習観点

- ブラウザ保存領域は利用者環境に残る
- token保存場所はセキュリティ設計に関わる
- 便利さと漏洩リスクを分けて考える
