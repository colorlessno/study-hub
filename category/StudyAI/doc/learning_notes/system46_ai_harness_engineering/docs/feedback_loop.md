# feedback loop 改善循環

## 流れ

1. fixtureを作る。
2. AIまたはmockが出力を作る。
3. check scriptで形式と禁止操作を確認する。
4. 失敗した場合はfixture、prompt、checkのどれが原因か分ける。
5. 実行記録の`failure_reason`と`rerun_condition`を確認する。
6. `feedback_memo`へ次に直す対象を残す。
7. 修正後に同じfixtureで再実行し、新しい実行記録と比較する。

## 改善単位

| 問題 | 改善対象 |
| --- | --- |
| 入力が曖昧 | fixture |
| 出力形式がぶれる | prompt / expected output |
| 禁止操作を拾えない | check script |
| 人間判断が必要 | approval boundary |

## 記録の扱い

- 検証結果は画面への表示だけで終わらせず、`samples/run_logs/`へJSONで保存する。
- 正常結果にも使用したfixture、check、時刻を残す。
- 異常結果には失敗理由、再実行条件、改善メモを残す。
- 保存した記録を比較し、同じfixtureで判定が再現することを確認する。
