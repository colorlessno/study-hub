# security08 XSS対策 基本設計
## 0. 関連要件

- `../requirements/security08_xss_requirements.md`

## 1. 設計目的
ユーザー入力をHTMLではなく文字として表示し、危険なDOM sinkとの差を学ぶ。
## 2. 対象範囲

- `textContent`
- `innerHTML`の危険性
- output context
- CSPの位置付け
- ローカル静的画面

## 3. 成果物構成

```text
src/backend/src/studysecurity/systems/security08_xss/
  Dockerfile
  package.json
  app/server.js
  public/index.html
  public/app.js

doc/learning_notes/security08_xss/
  README.md
  escaping_rules.md
```

## 4. 入力
| 入力 | 内容 |
|---|---|
| text | tag形式を含む学習用文字列 |
| render action | 安全表示ボタン |

## 5. 出力
| 出力 | 内容 |
|---|---|
| safe view | `textContent`による文字表示 |
| danger note | `innerHTML`なら解釈されるという説明 |

## 6. 処理方針
1. ローカルstatic serverで画面を表示する
2. 入力値を`textContent`へ設定する
3. tagが実行されず文字として表示されることを確認する
4. `innerHTML`を危険なsinkとして説明する
5. context別の対策を補足文書で確認する
## 7. 確認観点

- 安全表示が`textContent`を使っているか
- 危険なHTMLを実行する教材になっていないか
- 出力contextで対策が異なると説明できるか
## 8. 後続工程への引き継ぎ

詳細設計では、static server、DOM更新、安全制約、確認手順を定義する。
