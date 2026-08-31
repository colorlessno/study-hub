# system45 詳細設計

## Agent skill packaging

## 0. 関連要件

- `../requirements/system45_requirements.md`
- `../basic_design/system45_basic_design.md`

## 1. 製造対象

```text
doc/learning_notes/system45_agent_skill_packaging/
  README.md
  docs/
    skill_contract.md
    reference_split.md
    failure_patterns.md
    skill_vs_tool_calling.md
src/apps/system45_agent_skill_packaging/
  sample_skill/
    SKILL.md
    references/
      checklist.md
      examples.md
      missing_fields.md
      sensitive_input.md
    scripts/
      validate_input.js
```

## 2. `SKILL.md` 設計

| section | 内容 |
|---|---|
| タイトルと概要 | 小さなレビューを行う技能であることと、証拠に基づいて確認することを示す |
| 入力 | `task_goal`, `target_file`, `expected_output`を示す |
| 出力 | レビュー結果の要約、根拠を示した指摘事項、残っているリスクを示す |
| 制約 | 秘密情報や個人情報の除外、対象ファイル不存在時の停止、スクリプトの用途を示す |
| 参照資料 | 入力例と入力確認表を、必要な場合だけ読むことを示す |
| 手順 | 入力検証、対象読取、指摘作成、結果出力の順を示す |
| 失敗時の扱い | 入力不足、権限不足、危険操作、秘密情報、検証失敗時の停止条件を示す |

## 3. contract 設計

| 項目 | 内容 |
|---|---|
| required input | task goal、target file、expected output |
| forbidden input | secrets、token、password、個人情報 |
| output | レビュー結果の要約、根拠を示した指摘事項、残っているリスク |
| refusal / stop | 入力不足、対象ファイル不存在、権限不足、危険操作、秘密情報・個人情報、入力検証の失敗 |

## 4. reference分割設計

| ファイル | 置く内容 |
|---|---|
| `SKILL.md` | 常に必要な短い指示 |
| `references/checklist.md` | 長い確認観点 |
| `references/examples.md` | 正常な入力例 |
| `references/missing_fields.md` | 必須項目が不足した入力例 |
| `references/sensitive_input.md` | 秘密情報を含む入力例 |
| `scripts/validate_input.js` | 決定的に検査できる入力チェック |

scriptはモデル判断の代替ではなく、決定的に検査できる前提条件として扱う。

## 5. script設計

| script | 入力 | 出力 | 目的 |
|---|---|---|---|
| `validate_input.js` | JSONコードブロックを含むMarkdownファイル | 標準出力または標準エラーと終了コード | 必須項目名と禁止語をテキストとして検査 |

scriptはモデル判断の代替ではなく、決定的に検査できる前提条件として扱う。

検証規則:

- ファイル全体をUTF-8で読み込む。
- `task_goal`, `target_file`, `expected_output`の文字列が1つでもなければ、不足項目を標準エラーへ出して終了コード1にする。
- `secret`, `token`, `password`を大文字小文字を区別せず検索し、1つでもあれば検出語を標準エラーへ出して終了コード1にする。
- 必須項目が揃い、禁止語がなければ`input sample looks valid`を標準出力へ出して終了コード0にする。
- JSON構文、対象ファイルの実在、path形式はこのスクリプトでは検証しない。

## 6. 失敗パターン設計

| case | 判断 | 対応 |
|---|---|---|
| required input missing | stop | 不足項目を列挙する |
| forbidden input included | stop | 秘密情報・個人情報を扱わない |
| unsafe operation requested | stop / approval | 危険操作の理由と承認境界を示す |
| reference too large | continue | 必要部分だけ読む |
| script failed | stop | stderrと再実行条件を記録する |

## 7. StudyHub接続

| 項目 | 値 |
|---|---|
| presentation | `command` |
| lifecycle | `one-shot` |
| connection type | `command-one-shot` |
| working directory | `category/StudyAI/src/apps/system45_agent_skill_packaging` |

| operation | 入力ファイル | 期待結果 |
|---|---|---|
| 正常な入力例を検証 | `sample_skill/references/examples.md` | 終了コード0と成功メッセージ |
| 必須項目の不足を検出 | `sample_skill/references/missing_fields.md` | 終了コード1と不足項目。StudyHubでは想定した失敗として結果を表示する |
| 秘密情報を含む入力を拒否 | `sample_skill/references/sensitive_input.md` | 終了コード1と禁止語。StudyHubでは想定した失敗として結果を表示する |

教材切替では`SKILL.md`, `validate_input.js`, `examples.md`, `checklist.md`を表示する。外部通信、DB接続、実行履歴の永続化は行わない。

## 8. 確認手順

1. StudyHubで「正常な入力例を検証」を実行し、終了コード0の結果を確認する。
2. 「必須項目の不足を検出」を実行し、`target_file`と`expected_output`の不足を確認する。
3. 「秘密情報を含む入力を拒否」を実行し、`password`の検出を確認する。
4. `SKILL.md`とreferencesの分割を確認する。
5. 失敗パターンを1件ずつ確認する。
6. skillとtool callingの違いを学習メモで確認する。

個別に確認する場合はcmd.exeで次を実行する。

```bat
cd /d C:\work\work20260617\category\StudyAI\src\apps\system45_agent_skill_packaging
rtk node sample_skill\scripts\validate_input.js sample_skill\references\examples.md
rtk node sample_skill\scripts\validate_input.js sample_skill\references\missing_fields.md
rtk node sample_skill\scripts\validate_input.js sample_skill\references\sensitive_input.md
```

後ろの2コマンドは拒否を確認する教材のため、終了コード1が正常な確認結果である。

## 9. 完了条件

- skill定義に必要な項目を説明できる
- referencesとscriptsへ分割する理由を説明できる
- 入力不足、権限不足、危険操作時の対応を説明できる

## 10. 安全性

- sampleに実際のsecrets、token、password、個人情報を含めない。拒否例では`password`キーとダミー値だけを使用する
- 外部サービス操作やmarketplace公開は行わない
- StudyHubからscriptへ渡すファイルは`sample_skill/references/`内の3入力例に限定する。script自体は引数で指定されたファイルをUTF-8で読み込み、書き込みは行わない
