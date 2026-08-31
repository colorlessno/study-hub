# 役割別AIアシスタントの権限設計

人事、営業などの役割別AIアシスタントを題材に、役割定義、強制権限、エスカレーション、評価を分けて学ぶ文書・演習プロジェクトです。

- [AI社員 Claude実装ガイド](./AI社員_Claude実装ガイド.md)
- [役割境界の比較演習](./exercise/README.md)

## このテーマでできるようになること

- CLAUDE.mdに定義する役割、担当範囲、禁止事項、応答形式を説明できる
- `.claude/settings.json`で、使用を禁止する操作を設定できる
- 依頼例と比較表を使い、権限の順守と人間への引き継ぎ判断を評価できる

## 最初に取り組むこと

Claude CodeやAPIへ接続せず、2つの役割定義、権限設定、8つの評価用依頼を検証できます。

```cmd
cd StudyAICorporateEmployee
python exercise\scripts\validate_profiles.py
python -m unittest discover -s exercise\scripts -p "test_*.py"
```

次に `exercise/cases.json` から1件選び、「回答」「確認」「人間へ引き継ぐ」「拒否」のどれになるか予想してから、各役割の `CLAUDE.md` と照合します。Claude Codeを利用できる場合だけ実際の応答評価へ進みます。

## 学習する境界

| 層 | 成果物 | 学ぶこと |
|----|--------|----------|
| 行動指示 | `CLAUDE.md` | 役割、担当範囲、禁止事項、応答形式 |
| 強制権限 | `.claude/settings.json` | 使用禁止の設定、確認できない操作の遮断 |
| 評価 | `cases.json`、比較表 | 回答内容だけでなく、権限と引き継ぎ判断を採点する |

この教材は実在企業の業務を自律実行する「社員」ではなく、架空データを使った役割別AIアシスタントの試作を扱います。実データ、実送信、契約・人事判断は対象外です。
