# StudyAI frontend npm audit 方針

## 目的

StudyAI frontend の依存関係は `npm audit` で確認する。Docker build 中の警告を見過ごさず、レビュー対象の作業として扱うための方針を残す。

## 初回確認結果

以前の lockfile では moderate の脆弱性が4件出ていた。

| package | 原因 | 対応 |
|---|---|---|
| `vite` | 古い Vite の path traversal advisory | Vite を 5.x から 7.3.2 へ更新 |
| `esbuild` | 古い依存連鎖による dev server request exposure | Vite 更新により解消 |
| `@vitejs/plugin-react` | Vite 依存経由の影響 | plugin を 4.x から 5.2.0 へ更新 |
| `postcss` | CSS stringify XSS advisory | `npm audit fix` 相当の lockfile 更新で解消 |

`axios` も既存互換範囲内の patch 更新として `1.15.2` へ更新した。

## 現在の方針

- Docker では `npm ci` を使い、`package-lock.json` に基づいて再現する。
- 依存関係を変更したら `npm audit` を実行する。
- Docker build 警告を許容扱いにする前に、脆弱性の有無と影響を確認する。
- まず破壊的変更の少ない更新を優先する。
- 破壊的更新が必要な場合は、直接依存を更新し、frontend build を確認してから完了扱いにする。
- UI と routing の互換確認をしない限り、React の major version は上げない。

## 標準コマンド

```cmd
npm.cmd --prefix .\frontend audit
npm.cmd --prefix .\frontend run build
docker compose -f .\docker-compose.yml build frontend
```

## 完了条件

`npm audit` が脆弱性0件を返し、frontend build が成功したら、この対応は完了扱いにする。
