# web47 PDFファイル選択時の検証 詳細設計

## ファイル構成

```text
web47_pdf_upload/
├─ app/
│  ├─ index.html
│  └─ src/
│     ├─ main.js
│     ├─ file-validation.js
│     └─ style.css
└─ Dockerfile
```

## 判定処理

`validateFileMetadata(file)`は`name`、`size`、`type`を読み取り、問題の配列を返します。

判定順は拡張子、種類、容量です。どれか一つで処理を止めず、該当する問題をすべて配列へ追加します。種類が空の場合は、ブラウザから種類が通知されていない状態として表示し、現在の実装では問題に加えません。

## 用意された確認データ

`getSampleFileMetadata(sampleId)`は次のいずれかを返します。

| 識別子 | ファイル名 | 種類 | 容量 |
|---|---|---|---:|
| `valid` | `sample-small.pdf` | `application/pdf` | 3,072バイト |
| `invalid-type` | `sample-document.txt` | `text/plain` | 1,200バイト |
| `too-large` | `sample-large.pdf` | `application/pdf` | 1,048,577バイト |

不明な識別子は実装誤りとして例外にします。

## 画面更新

`showResult(file)`は判定結果を受け取り、判定文、ファイル情報、問題一覧を更新します。問題なしは`data-state="valid"`、問題ありは`data-state="invalid"`として枠の色を切り替えます。

`resetResult()`はファイル入力を空にし、結果を未選択へ戻します。

## 表示する容量

`formatFileSize(size)`は、1MiB以上をMiB、1KiB以上をKiB、それ未満をバイトで表示します。判定の根拠が分かるように元のバイト数も併記します。

## 画面で確認できない範囲

この実装はファイル本体を読み込まないため、PDFの識別情報、破損、暗号化、ページ数、ウイルスを判断できません。送信と保存も行わないため、サーバー側の再検証、保存先、処理状態も実装しません。
