# ヘッダー方針

- CSP: 読み込み元を制限し、`frame-ancestors`と`object-src`で不要な埋め込みを拒否する。
- X-Frame-Options: legacy browser向けにframe表示を拒否する。
- nosniff: MIME推測を抑制する。
- Referrer-Policy: 参照元送信を抑える。
- Permissions-Policy: 不要なブラウザ機能を無効化する。
- Cache-Control: 学習用responseを保存しない。

HSTSはHTTPS接続を強制するproduction向けpolicyです。local HTTP教材では付与せず、HTTPSが全対象domainで安定稼働してから有効期間とsubdomain範囲を検討します。
