# arch01 詳細設計
## System anatomy walkthrough

## 0. 関連文書

- `../requirements/arch01_system_anatomy_walkthrough_requirements.md`
- `../basic_design/arch01_basic_design.md`

## 1. 製造対象

```text
src/apps/arch01_system_anatomy_walkthrough/
  app/
    server.js                    HTTP API、SQLite、実行ログ、障害モード
    public/
      index.html                 操作画面
      main.js                    API通信と画面更新
      styles.css                 表示調整
  test/server.test.js            保存・ログ・障害・復旧の単体テスト
doc/learning_notes/arch01_system_anatomy_walkthrough/
  README.md
  docs/
    target_system_summary.md
    context_container_component.md
    request_data_flow.md
    failure_mode.md
    decision_notes.md
    evidence_vs_inference.md
```

## 2. 対象システム選定基準

| 条件 | 内容 |
|---|---|
| 教材性 | 画面、API、DB、ログ、設定のうち複数を観察できる |
| 安全性 | 実秘密情報、実個人情報、実障害情報を含まない |
| 再現性 | ローカルまたは既存Study成果物として再確認できる |
| 粒度 | 代表操作1つを追跡できる規模に限定する |

本テーマでは他テーマへ依存せず、`arch01_system_anatomy_walkthrough`を対象システムとして固定する。

## 3. 実行環境

| 項目 | 内容 |
|---|---|
| 起動入口 | `node app/server.js` |
| 画面 | `http://127.0.0.1:43701/` |
| 保存先 | arch01専用SQLiteファイル |
| API | `/api/orders`、`/api/logs`、`/api/failure-mode` |
| 状態確認 | `/health`、`/ready` |
| 他テーマとの依存 | なし |

## 4. system summary テンプレート

| 項目 | 内容 |
|---|---|
| system name | 対象システム名 |
| purpose | 何を解決するシステムか |
| users | 主な利用者 |
| main use cases | 代表操作 |
| constraints | 運用、セキュリティ、性能、復旧制約 |
| out of scope | 今回観察しない範囲 |

## 5. context / container / component 設計

| view | 記録項目 |
|---|---|
| context | 学習者、ブラウザ、arch01のシステム境界 |
| container | 静的画面、Node.js HTTPサーバー、arch01専用SQLite |
| component | 静的配信、注文API、入力検証、SQL、要求ログ、障害モード、health / ready |

図を作れない場合はMarkdown表で表現する。

## 6. request / data flow テンプレート

| step | layer | evidence | state change | note |
|---|---|---|---|---|
| 1 | UI | screenshot / DOM / route | 入力値 | 代表操作の開始 |
| 2 | API | method、path、status、body | request id | API境界 |
| 3 | server | `POST /api/orders`、Trace ID | 入力検証結果 | API処理 |
| 4 | SQLite | `orders`、`request_logs` | insert | 永続状態と証拠 |
| 5 | response | status、body、画面表示 | 結果表示 | 利用者への戻り |

## 7. failure mode テンプレート

| failure | trigger | observed behavior | recovery | design note |
|---|---|---|---|---|
| validation error | 不正入力 | 400 / error message | 入力修正 | UI/API両方で扱う |
| 教材用障害モード | 画面または`POST /api/failure-mode` | `/health`は200、`/ready`と注文登録は503 | 障害モード解除 | 生存と受付可否を分けて観察する |
| SQLite利用不可 | DBファイルへアクセス不能 | 500 / startup failure | 保存先権限とパスを修正して再起動 | 永続化境界を確認する |

## 8. decision note 設計

| 項目 | 内容 |
|---|---|
| decision | 採用されている構成判断 |
| evidence | 判断を推測した証拠 |
| requirement / constraint | その判断を必要にする要件・制約 |
| trade-off | 得るもの、失うもの |
| confidence | evidence、inference、unknown の区分 |

## 9. 確認手順

1. arch01を起動する
2. 画面から注文を登録し、SQLiteの一覧を確認する
3. Trace IDを使ってAPI要求、保存処理、実行ログを対応付ける
4. 障害モードで503と保存失敗を確認し、復旧する
5. system summaryとcontext / container / componentを整理する
6. request / data flowとfailure modeを実行証拠から記録する
7. decision noteで構成判断を記録し、evidenceとinferenceを分ける

## 10. 完了条件

- システムの構成要素とデータの流れを説明できる
- 構成判断と要件・制約の関係を説明できる
- 証拠と推測を分けて記録できる
- 注文と要求ログが停止・再起動後もarch01専用SQLiteから読み出せる

## 11. 安全性

- 実企業秘密、実個人情報、実障害情報を扱わない
- arch01専用SQLite以外へ書き込まない
- 推測は推測として明記し、断定しない
