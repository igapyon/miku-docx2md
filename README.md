# miku-docx2md

`miku-docx2md` は、Word の `.docx` ファイルを Markdown に変換するローカル実行ツールです。

見た目を Word どおりに再現するためのツールではありません。文章、見出し、リスト、表、リンクなどの文書構造を Markdown として読みやすく取り出すことを目的にしています。

## できること

- `.docx` ファイルを Markdown に変換
- ブラウザだけでローカル変換
- Node.js CLI で変換
- 見出し、段落、箇条書き、番号付きリスト、表を出力
- 太字、斜体、取り消し線、下線を一部保持
- 外部リンクと解決可能な文書内リンクを出力
- 解決可能な埋め込み画像を sidecar asset として出力
- 変換サマリーを表示または保存
- debug 用に unsupported 要素の HTML comment trace を出力

## 使い方: ブラウザ

`index.html` をブラウザで開きます。

1. `.docx` ファイルを選択します。
2. 変換ボタンを押します。
3. Markdown と summary を確認します。
4. 必要に応じて Markdown、summary、画像 asset ZIP をダウンロードします。

画像 asset ZIP は、変換結果に解決可能な埋め込み画像がある場合だけ利用できます。

## 使い方: CLI

```bash
npm run cli -- ./sample.docx --out ./sample.md
```

summary も出力する例:

```bash
npm run cli -- ./sample.docx --out ./sample.md --summary --summary-out ./sample.summary.txt
```

画像 asset も出力する例:

```bash
npm run cli -- ./sample.docx --out ./sample.md --assets-dir ./sample.assets
```

debug comment も含める例:

```bash
npm run cli -- ./sample.docx --out ./sample.md --debug
```

## CLI オプション

| Option | Description |
| --- | --- |
| `--out <file>` | Markdown の出力先 |
| `--assets-dir <dir>` | 解決可能な埋め込み画像 asset の出力先 |
| `--summary` | summary を標準出力へ表示 |
| `--summary-out <file>` | summary の出力先 |
| `--debug` | unsupported 要素の HTML comment trace を Markdown に含める |
| `--include-unsupported-comments` | `--debug` と同じ |
| `--help` | ヘルプを表示 |

`--assets-dir` を指定すると、解決可能な画像は `word/media/example.png` のような package-relative path で保存されます。Markdown 側も、可能な場合は `[Image: ...]` placeholder ではなく相対 `![](...)` link を出力します。

asset 出力先には `manifest.json` も作成されます。manifest には asset path、media type、alt text、byte size、source trace、block index、document position が含まれます。

## 出力方針

`miku-docx2md` は、Word の見た目ではなく文書構造を優先します。

- Word のページレイアウトは再現しません。
- 変換結果は GitHub-compatible Markdown / HTML に寄せます。
- 表の結合セルは `←M←` と `↑M↑` の placeholder で簡略表現します。
- 画像は本文内の完全再現ではなく、解決可能なものを asset として出力します。
- unsupported 要素は通常 Markdown には出しません。
- `--debug` 使用時のみ、unsupported 要素の trace を HTML comment として出します。

## 主な対応内容

| Content | Status |
| --- | --- |
| 段落 | 対応 |
| 見出し | 対応 |
| 太字、斜体、取り消し線、下線 | 一部対応 |
| 段落内改行 | 対応 |
| 外部リンク | 対応 |
| 解決可能な文書内リンク | 対応 |
| 箇条書き、番号付きリスト、ネスト | 対応 |
| 表 | 対応 |
| 表の結合セル | placeholder で簡略対応 |
| 埋め込み画像 | 解決可能なものを sidecar asset として出力 |
| Word の見た目の完全再現 | 非対応 |

## ビルド

```bash
npm run build
```

`index-src.html` と `src/ts/` から、配布用の `index.html` と `src/js/` を再生成します。

## テスト

```bash
npm run test:unit
```

## 詳細ドキュメント

- 利用者向け補足: [docs/usage.md](./docs/usage.md)
- 仕様と設計方針: [docs/docx2md-spec.md](./docs/docx2md-spec.md)
- 実装仕様: [docs/docx2md-impl-spec.md](./docs/docx2md-impl-spec.md)
- upstream 参照方針: [docs/upstream.md](./docs/upstream.md)

## License

Apache License 2.0

See [LICENSE](./LICENSE).
