# skill と tool calling の違い

## skill

skillは、作業の進め方、読むべき資料、注意点、補助scriptの使い方をまとめた手順である。

向いているもの:

- recurring workflow
- domain-specific review
- file構成や判断基準の共有
- agentが段階的に参照すべき資料

## tool calling

tool callingは、外部APIやlocal commandを実行して、状態を読んだり変更したりする仕組みである。

向いているもの:

- repositoryやissueの取得
- command実行
- databaseや外部serviceの操作
- 決定的な検証

## 使い分け

| 判断 | skill | tool calling |
| --- | --- | --- |
| 手順を教える | 適している | 不向き |
| 外部状態を読む | 補助的 | 適している |
| 判断基準を共有する | 適している | 不向き |
| 実行結果を得る | 不向き | 適している |

skillは「どう考えて進めるか」、tool callingは「実際に何かを読む・実行するか」を担当する。
