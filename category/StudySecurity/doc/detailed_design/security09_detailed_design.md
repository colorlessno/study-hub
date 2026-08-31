# security09 ファイルアップロード制御 詳細設計
## 0. 関連文書

- `../requirements/security09_file_upload_requirements.md`
- `../basic_design/security09_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studysecurity/systems/security09_file_upload/
  Dockerfile
  package.json
  app/server.js
  public/index.html
  public/app.js

doc/learning_notes/security09_file_upload/
  README.md
  upload_policy.md
```

## 2. 主要設計
| 要素 | 内容 |
|---|---|
| 拡張子 | 許可リスト方式で検証する |
| MIME | 現実装では入力・検証せず、ブラウザ申告値を単独で信用できないことを文書化する |
| サイズ | 0未満と1MiB超過を別の理由で拒否する |
| 保存名 | 元ファイル名を保存名に使わない設計を説明する |
| local server | `http://localhost:4109`でmetadata検証画面を配信する |

## 3. 安全制約
- 実ファイルの選択、送信、保存を行わない。
- ファイル内容の完全判定は扱わず、境界と限界を明記する。
- 実マルウェアや危険ファイルは使わない。
## 4. 確認手順
1. local serverを起動して画面と`app.js`が200になることを確認する。
2. 許可拡張子のfile nameがmetadata上は許可されることを確認する。
3. 禁止拡張子、size超過、負数がそれぞれ拒否されることを確認する。
4. MIME、内容検査、保存名、保存場所が未実装であることと、本番で必要な理由を読む。
## 5. 完了条件

- 拡張子、MIME、内容検査の役割を説明できる。
- 保存名を再生成する理由を説明できる。
- アップロード処理のリスク境界を説明できる。
