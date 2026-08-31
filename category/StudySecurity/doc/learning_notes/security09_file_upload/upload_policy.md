# アップロード方針

- 許可list方式でextensionを確認する。
- request全体とfile単位のsize上限を設ける。
- browser申告MIMEは参考値として扱い、単独で信用しない。
- magic numberやparserで内容形式をserver-sideで確認する。
- malware scanや業務上の内容検査が終わるまで隔離する。
- storage keyはserver側で再生成し、original file nameは表示用metadataとして分離する。
- upload領域をapplicationの実行fileや公開Web rootから分離する。
- download時は`Content-Type`と`Content-Disposition`を安全側に設定する。

本教材が実装するのは、file nameとsizeを手入力するclient-side metadata判定だけです。この結果が`accepted: true`でも、内容検査やserver-side検証を通過した意味にはなりません。
