# miku-docx2md 利用ガイド

この文書は、README に置くには長い利用者向けの補足をまとめます。

## ブラウザで使う

ローカルのブラウザで変換したい場合は `index.html` を使います。

1. `index.html` を開きます。
2. `.docx` ファイルを選択します。
3. 変換を実行します。
4. Markdown と summary を確認します。
5. 必要に応じて Markdown、summary text、画像 asset をダウンロードします。

ブラウザ版は、選択したローカルファイルをブラウザ UI 上で処理します。

## CLI で使う

Markdown を出力します。

```bash
npm run cli -- ./sample.docx --out ./sample.md
```

summary を標準出力へ表示します。

```bash
npm run cli -- ./sample.docx --out ./sample.md --summary
```

summary をファイルへ保存します。

```bash
npm run cli -- ./sample.docx --out ./sample.md --summary-out ./sample.summary.txt
```

解決可能な画像 asset も出力します。

```bash
npm run cli -- ./sample.docx --out ./sample.md --assets-dir ./sample.assets
```

unsupported 要素の debug comment も出力します。

```bash
npm run cli -- ./sample.docx --out ./sample.md --debug
```

## 画像 asset 出力

`--assets-dir <dir>` を指定すると、解決可能な埋め込み画像が asset directory 配下へ保存されます。

出力 path の例:

- `manifest.json`
- `word/media/example.png`

可能な場合、Markdown 内の画像 placeholder は相対画像 link に変換されます。

asset 出力なし:

```markdown
[Image: Example alt text]
```

asset 出力あり:

```markdown
![Example alt text](sample.assets/word/media/example.png)
```

## asset manifest

asset 出力には `manifest.json` が含まれます。

manifest には次の情報が入ります。

- asset kind
- source package path
- media type
- alt text
- source trace
- owning block index
- finer document position
- byte size

`[Content_Types].xml` がある場合、拡張子による推定より package-declared content type を優先します。

## debug comment

通常、unsupported 要素は Markdown に出力されません。

`--debug` または `--include-unsupported-comments` を使うと、簡潔な HTML comment が出力されます。

例:

```markdown
<!-- unsupported: drawing -->
```

debug comment は診断用です。最終的な文章として読ませる用途ではありません。
