# security21 AIコンテンツの判定と監査

入力の意図と文脈から、分類、判定結果、安全な応答、人による確認の要否を決める教材です。実際の不適切な本文は扱わず、抽象化した6件の入力例を使用します。

## このテーマでできるようになること

- 6件の入力例と期待する判定結果を比較できる
- 文脈によって判定結果が変わる例を確認できる
- 入力本文を保存しない監査記録を確認できる
- 人による確認が必要な判定だけを抽出できる
- 分類、判定結果、理由コード、安全な応答の対応を確認できる

## 最初に取り組むこと

1. StudyHubで「6件の判定結果」を実行し、M-001〜M-006の`decision`と`expected`を比較する。
2. 「監査記録」を実行し、入力本文の代わりに短いhashと判定情報が記録されることを確認する。
3. 「人による確認対象」を実行し、`refuse`と`escalate`になった3件だけが表示されることを確認する。
4. 「入力を判定する処理」と「分類と判定結果の定義」を表示し、画面で確認した結果とソースを照合する。

## 6件の判定内容

| 入力例 | 文脈 | 期待する判定 | 確認内容 |
|---|---|---|---|
| M-001 | support | `allow` | 制限対象ではない通常の問い合わせ |
| M-002 | targeted person | `refuse` | 特定人物への攻撃的な依頼を拒否する |
| M-003 | imminent risk | `escalate` | 緊急性のある入力を人の対応へつなぐ |
| M-004 | medical education | `caution` | 医療・教育文脈に限定して注意付きで扱う |
| M-005 | personal data | `refuse` | 非公開データの開示要求を拒否する |
| M-006 | classification | `allow_with_boundary` | 分類だけを許可し、詳細の再掲を避ける |

M-004とM-006は同じ`sexual_nsfw`分類でも、医療・教育の一般説明は`caution`、分類だけを求める入力は`allow_with_boundary`となります。分類だけで判断せず、意図と文脈を合わせて確認します。

## 監査記録で確認すること

- `category`、`decision`、`reason_code`、`confidence`を記録する。
- 入力本文を記録せず、照合用の`sample_hash`だけを残す。
- `refuse`と`escalate`では`review_required`を有効にする。
- hashは入力本文を安全に保存できることを保証する仕組みではない。推測されやすい短い入力では別の対策も必要になる。

## 実装を直接確認する場合

```bat
cd /d C:\work\work20260617\category\StudySecurity\src\backend\src\studysecurity\systems\security21_ai_content_moderation
rtk npm.cmd run check
rtk npm.cmd test
rtk node app\demo.js decisions
rtk node app\demo.js audit
rtk node app\demo.js review
```

`check`はJavaScriptの構文、`test`は判定規則、3つの`demo`はStudyHubに接続した表示内容を確認します。

## この教材の範囲

- 抽象化した入力例と正規表現による判定を使用する。
- 実際のコンテンツ判定モデルや外部APIには接続しない。
- 実ユーザーデータや実際の緊急連絡先は扱わない。
- 自動テストは分岐の変化を検出するもので、実運用上の安全性を保証するものではない。
