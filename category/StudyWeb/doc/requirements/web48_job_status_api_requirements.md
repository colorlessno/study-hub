# web48 job status API 要件定義

## 1. 目的

時間がかかる処理をすぐに結果返却せず、受付、状態確認、完了、失敗として扱うAPI設計を学ぶ。

## 2. 学習対象

- background job
- job status
- queued / running / succeeded / failed
- polling
- retry concept

## 3. 作成する成果物

- job受付API
- job status API
- 進捗確認画面
- 失敗理由表示
- 状態遷移メモ

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | 長時間処理をjobとして受付できる |
| FR-02 | job id を返せる |
| FR-03 | job status を確認できる |
| FR-04 | succeeded / failed を表現できる |
| FR-05 | 失敗理由を確認できる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | 学習用にメモリ管理で再現できる |
| NFR-02 | HTTPリクエストを長時間待たせない設計にする |
| NFR-03 | 後続のretry / timeout学習へ接続できる |

## 6. 対象外

- 本格キュー
- Redis / BullMQ
- スケジューラー
- 分散worker

## 7. 受入条件

- job受付と状態確認を分けて説明できる
- queued / running / succeeded / failed を確認できる
- 長時間処理を同期APIにしない理由を説明できる

## 8. 学習観点

- AI/OCR/CSV取込は時間がかかる前提で扱う
- job id を返して後から状態確認する
- 失敗理由は利用者と開発者の両方に必要
