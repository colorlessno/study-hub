# web39 Error Boundary 詳細設計

## 0. 関連文書

- `../requirements/web39_error_boundary_requirements.md`
- `../basic_design/web39_basic_design.md`

## 1. 製造対象

```text
src/frontend/static/studyweb/systems/web39_error_boundary/
  Dockerfile
  app/index.html
  app/src/main.jsx
  app/src/errorLog.js
  app/bundle/main.js
  package.json
  test/errorLog.test.js
doc/learning_notes/web39_error_boundary/
  README.md
  docs/error_boundary_behavior.md
```

## 2. 実装方式

Reactのclass componentでError Boundaryを実装する。保護対象の子componentが描画中に例外を投げると、`getDerivedStateFromError`でfallbackへ切り替え、`componentDidCatch`で開発者向け情報をConsoleへ記録する。

## 3. 画面・処理要素

| 要素 | 役割 |
|---|---|
| `正常表示` button | 保護対象を正常状態にする |
| `エラーを発生させる` button | 保護対象のrenderで例外を発生させる |
| `ProtectedPanel` | Error Boundaryで囲む表示領域 |
| `ErrorBoundary` | 描画例外を捕捉し、fallbackと復旧操作を表示する |
| `componentDidCatch` | 例外名、message、component stackをConsoleへ記録する |

## 4. 処理手順

1. 初期表示では`ProtectedPanel`が正常内容を描画する。
2. エラー操作で`shouldThrow`をtrueにする。
3. `ProtectedPanel`のrender中に`Error`を投げる。
4. `ErrorBoundary`が例外を捕捉し、保護領域だけをfallbackへ切り替える。
5. `componentDidCatch`が開発者向け情報をConsoleへ記録する。
6. 「もう一度表示する」で原因となるstateとBoundaryのエラーstateを戻し、ページ全体を再読み込みせず復旧する。

## 5. 情報表示

fallbackには安全な概要と復旧方法だけを表示する。例外名、message、component stackは開発者向けConsoleへ分離する。本格的な監視サービスへの送信は要件の対象外とする。

## 6. 捕捉範囲

- 子componentのrender、constructor、対応するlifecycleで発生する例外をError Boundaryが捕捉する。
- Error Boundary自身の例外は、そのBoundary自身では捕捉できない。
- event handler、`setTimeout`等の非同期callback、サーバー側例外は自動捕捉しない。
- 本テーマでは画面の一部だけをBoundaryで囲み、見出しと操作を残す。

## 7. 確認手順

1. 正常表示を確認する。
2. throw操作でpanelだけがfallbackになることを確認する。
3. 見出し・操作buttonがpanelの外に残ることを確認する。
4. 「もう一度表示する」でページ全体を再読み込みせず復旧する。
5. ソースで`getDerivedStateFromError`と`componentDidCatch`の役割を確認する。

## 8. 完了条件

- 画面全体を真っ白にせずfallbackを表示できる。
- 利用者向け表示と開発者向け情報を分けて説明できる。
- 同期的なtry/catchとReact Error Boundaryの捕捉範囲を区別できる。
- Error Boundaryの捕捉対象には限界があると説明できる。
