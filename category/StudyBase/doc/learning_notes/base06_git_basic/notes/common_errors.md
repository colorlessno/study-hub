# よくある失敗と対処

| 失敗 | 原因 | 対処 |
|---|---|---|
| commit 対象が多すぎる | `git add .` の範囲を確認していない | `git status` と `git diff --cached` を確認する |
| logファイルを追加した | `.gitignore` 不足 | `.gitignore` を追加して除外する |
