# miku-docx2md

`miku-docx2md` は、Word の `.docx` ファイルを Markdown に変換するローカル実行ツールです。

見た目を Word どおりに再現するためのツールではありません。文章、見出し、リスト、表、リンクなどの文書構造を Markdown として読みやすく取り出すことを目的にしています。

この README は、概要と最短の使い方をまとめます。詳しい CLI option、画像 asset、debug 出力は [docs/usage.md](./docs/usage.md) を参照してください。

## できること

- `.docx` ファイルを Markdown に変換
- Node.js CLI で変換
- 見出し、段落、箇条書き、番号付きリスト、表を出力
- 太字、斜体、取り消し線、下線を一部保持
- 外部リンクと解決可能な文書内リンクを出力
- 解決可能な埋め込み画像を sidecar asset として出力
- 変換サマリーを表示または保存
- debug 用に unsupported 要素の HTML comment trace を出力

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

進捗と処理時間の診断を stderr に出す例:

```bash
npm run cli -- ./sample.docx --out ./sample.md --verbose
```

CLI option の一覧、終了コード、asset 出力、`manifest.json` の詳細は [docs/usage.md](./docs/usage.md) と `npm run cli -- --help` にまとめています。

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

`src/ts/` から Node.js runtime 用の `dist/js/` を再生成します。`dist/` は生成物なので Git 管理しません。CLI runtime bundle は `npm run build:bundle`、Web / adapter 向け runtime bundle は `npm run build:runtime` で生成します。

## Web App

ブラウザ UI と Single-file Web App 配布物は、分離済みの [miku-docx2md-web](https://github.com/igapyon/miku-docx2md-web) が担当します。この repository は product core、CLI、Node.js runtime bundle を担当します。

## テスト

```bash
npm run test:unit
```

## 詳細ドキュメント

- 利用者向けの操作手順と CLI 詳細: [docs/usage.md](./docs/usage.md)
- 生成 Markdown の YAML front matter 契約: [docs/docx2md-front-matter.md](./docs/docx2md-front-matter.md)
- 実文書での品質確認: [docs/quality-check.md](./docs/quality-check.md)
- 実文書品質確認の記録テンプレート: [docs/real-document-validation-template.md](./docs/real-document-validation-template.md)
- 実文書品質確認メモ v0.8.2: [docs/real-document-validation-v0.8.2.md](./docs/real-document-validation-v0.8.2.md)
- 変換仕様と設計方針: [docs/docx2md-spec.md](./docs/docx2md-spec.md)
- 実装に沿った現在の挙動: [docs/docx2md-impl-spec.md](./docs/docx2md-impl-spec.md)
- Node/Web 分離手順: [docs/node-web-separation.md](./docs/node-web-separation.md)
- miku-soft 共有 reference: [docs/miku-soft-reference.md](./docs/miku-soft-reference.md)
- upstream 参照方針: [docs/upstream.md](./docs/upstream.md)

## License

Apache License 2.0

See [LICENSE](./LICENSE).
