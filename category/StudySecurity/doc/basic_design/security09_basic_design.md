# security09 ファイルアップロード制御 基本設計
## 0. 関連要件

- `../requirements/security09_file_upload_requirements.md`

## 1. 設計目的
ファイル名とsizeのmetadata検証を体験し、実uploadで必要な多層防御を整理する。
## 2. 対象範囲

- extension allowlist
- size limit
- MIMEの信頼境界
- generated storage name
- ローカル静的画面
## 3. 成果物構成

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

## 4. 入力
| 入力 | 内容 |
|---|---|
| file name | 拡張子を含む学習用文字列 |
| size | byte数を表す数値 |

## 5. 出力
| 出力 | 内容 |
|---|---|
| extension | 正規化した拡張子 |
| accepted | metadata上の許可・拒否 |
| errors | 拡張子、sizeのエラー配列 |

## 6. 処理方針
1. 拡張子を小文字へ正規化する
2. allowlistに含まれるか確認する
3. sizeが0以上1MiB以下か確認する
4. 判定結果を文字として表示する
5. 実uploadではserver-side検査が必要と説明する
## 7. 確認観点

- client-side判定だけで安全と説明していないか
- MIME、内容、保存名、保存場所の検査境界を説明できるか
- 実ファイルを送信・保存していないことが明確か
## 8. 後続工程への引き継ぎ

詳細設計では、metadata判定、static server、安全制約、確認手順を定義する。
