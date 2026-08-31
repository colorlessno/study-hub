# 役割別AIアシスタントをClaude Codeで試作する

## 前提

この教材でいう「AI社員」は、実在企業の権限を持つ社員ではない。架空の人事・営業caseを使い、業務範囲と引き継ぎ判断を検証する役割別AIアシスタントのprototypeである。

`CLAUDE.md`を置くとClaude Codeへproject固有の指示とcontextを渡せる。ただし、これは強制的なsecurity境界ではない。実行を禁止する必要がある操作はpermission設定やhookで制御する。

## 4つの層を分ける

| 層 | 主な設定 | 役割 |
|----|----------|------|
| 行動指示 | `CLAUDE.md` | 役割、担当業務、禁止事項、応答形式を伝える |
| 強制権限 | `.claude/settings.json` | toolのallow、ask、denyを設定する |
| 役割分担 | `.claude/agents/*.md` | custom subagentのpromptと利用可能toolを定義する |
| 外部連携 | MCP、Agent SDK等 | 外部systemへの接続、認証、監査、常時実行を実装する |

`CLAUDE.md`へ「実行しない」と書くことと、permissionでtoolをdenyすることは別である。重要な禁止事項は文章だけに依存しない。

## 認証と起動

Claude CodeはClaude.aiのsubscription、Claude Console、cloud providerなど複数の認証方法を扱う。`ANTHROPIC_API_KEY`だけが必須という前提にはしない。利用環境に合う方法でloginし、`/status`で認証状態を確認する。

```cmd
claude --version
claude auth status
```

各profileは別directoryで起動する。

```cmd
cd exercise\employee_hr
claude
```

```cmd
cd exercise\employee_sales
claude
```

起動後は次を確認する。

- `/memory`: 対象profileの `CLAUDE.md` が読み込まれたか
- `/permissions`: projectのdeny ruleが有効か
- `/status`: 認証方法とsession状態

2つのterminalで起動したsessionは独立している。自動的に会話や情報共有をするわけではない。

## 役割定義の契約

この教材のprofileは、次のsectionを必須とする。

| section | 問い |
|---------|------|
| 役割 | 何を支援するassistantか |
| 担当業務 | 何を回答・整理してよいか |
| 入力として扱ってよい情報 | どの情報だけを受け取るか |
| 禁止事項 | 何を判断・実行してはいけないか |
| エスカレーション | 誰へ、何を整理して引き継ぐか |
| 応答形式 | 判断と根拠をどう監査可能に残すか |

人事profileでは個人評価、給与決定、懲戒、法的判断を行わない。営業profileでは最終価格、契約承認、実送信、顧客個人情報の処理を行わない。

## 権限設定

`exercise/employee_hr/.claude/settings.json` と `exercise/employee_sales/.claude/settings.json` は、役割境界の学習中にfile変更、command実行、web接続、MCP、subagent委任を使わない設定にしている。

この設定は教材用の最小構成である。実systemへ広げる場合は、次を先に決める。

- 誰がpermission変更をreviewするか
- どのtoolと引数だけをallowするか
- 認証情報と個人情報をどこへ保存するか
- 実行前承認と実行後audit logをどう残すか
- 失敗、取消、再実行をどう扱うか

## AI接続なしの演習

```cmd
python exercise\scripts\validate_profiles.py
python -m unittest discover -s exercise\scripts -p "test_*.py"
```

validatorは次を確認する。

- 2profileの `CLAUDE.md` に必須sectionがある
- permission設定に必要なdeny ruleがある
- 8caseの入力と期待actionが揃っている
- case IDが重複せず、各profileに4種類のactionがある

## Claude Codeを使う演習

1. `exercise/cases.json` から対象profileのcaseを1件選ぶ。
2. AI応答を見る前に期待actionを予想する。
3. 対象profileのdirectoryでClaude Codeを起動する。
4. caseの `request` を貼り付ける。
5. `evaluation_template.md` で役割範囲、権限表現、privacy、引き継ぎ、応答形式を採点する。
6. 期待と異なる場合は、`CLAUDE.md`の曖昧な箇所とpermissionの不足を分けて修正する。

## custom subagentとの違い

複数profileを別terminalで動かすだけなら、各directoryの `CLAUDE.md` で役割を分けられる。1つのsessionから役割を委任する場合は、projectの `.claude/agents/` にYAML frontmatter付きMarkdownを作るか、`/agents`を使う。

subagentのtool制限はfrontmatterやpermissionで設定する。`CLAUDE.md`へ「別のAIを呼ぶ」と書くだけでは、custom subagentの定義や強制権限にはならない。

## この教材に含めないもの

- 実在社員・顧客の個人情報
- 実際の採用、給与、懲戒、契約、価格決定
- email、Slack、CRM等への実送信
- 常時起動や無人実行
- AI同士の自動交渉

これらを追加する段階では、役割promptの拡張ではなく、system設計、認証、最小権限、human approval、audit、停止手順を別途設計する。

## 公式資料

- [How Claude remembers your project](https://code.claude.com/docs/en/memory)
- [Configure permissions](https://code.claude.com/docs/en/permissions)
- [Create custom subagents](https://code.claude.com/docs/en/subagents)
- [Authentication](https://code.claude.com/docs/en/authentication)
- [Debug your configuration](https://code.claude.com/docs/en/debug-your-config)
