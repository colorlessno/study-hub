# aws01 IAM / 権限の基本 詳細設計
## 0. 関連文書

- `../requirements/aws01_iam_basics_requirements.md`
- `../basic_design/aws01_basic_design.md`

## 1. 製造対象

```text
doc/learning_notes/aws01_iam_basics/
  README.md
  docs/
src/backend/src/studyaws/systems/aws01_iam_basics/
  package.json
  Dockerfile or docker-compose.yml where applicable
  app/ api/ web/ src/ scripts/ events/ data/ storage as required by the local sample
src/infra/aws01_iam_basics/
  template.yaml where applicable
```

## 2. 実装詳細

- `policy_check.js` は`app-role`、`developer`、`readonly`、`admin`のJSONポリシーを読み、action/resourceの許可判定を表示する。
- 明示的denyがallowより優先されることをサンプルで確認する。
- `admin-risk`ではactionとresourceを`*`で許可する管理者ポリシーの範囲を抽出し、最小権限の3役割と比較する。
- 実AWS CLI、実AWS認証情報、実アクセスキーは使わない。
## 3. 実行コマンド
```powershell
npm run demo
npm run check
node app/policy_check.js admin-risk
```

## 4. 確認手順
1. `npm run demo`で各ポリシーの許可結果を確認する。
2. `readonly`が書き込み不可であることを確認する。
3. `app-role`が必要最小限の操作だけ許可されることを確認する。
4. `admin`が全操作を許可し、通常用途へ割り当てると過剰権限になることを確認する。
5. `docs/troubleshooting_checklist.md`で権限不足時の確認項目を読む。
## 5. 実AWS発展課題
IAM Policy Simulatorで同等の判定を確認する。実施時は検証用アカウント、最小権限、削除手順を別紙化する。
## 6. 完了条件

- ポリシーJSONから許可範囲を説明できる。
- 明示的denyの優先を説明できる。
- 認証情報を成果物へ置かない設計になっている。
