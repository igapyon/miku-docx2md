# 実文書での品質確認

この文書は、実際の `.docx` ファイルで変換品質を確認するための手順です。

## 目的

fixture test は既知の挙動を確認します。実文書での確認は、実用的な Word 文書で初めて見つかる変換ギャップを拾うために行います。

目的は Word の見た目を完全再現することではありません。文書構造が読みやすい Markdown として残ることを確認します。

## 検証用ドキュメント

形の違う `.docx` を少数用意します。

推奨カテゴリ:

- 簡単なメモや議事録
- 複数レベルの見出しを含む文書
- 箇条書き、番号付きリスト、ネスト list を含む文書
- 表を含む文書
- 文書内リンクと外部リンクを含む文書
- 埋め込み画像を含む文書
- 図形や chart など unsupported な視覚要素を含む文書

private または sensitive な文書は repository に commit しません。

## ブラウザ確認

各文書で次を確認します。

1. `index.html` を開きます。
2. `miku-docx2md.html` へ進みます。
3. `.docx` ファイルを選択します。
4. 変換を実行します。
5. Markdown preview を確認します。
6. summary preview を確認します。
7. unsupported comment を有効にして debug-oriented output を確認します。
8. 画像 asset がある場合は download します。

確認観点:

- 見出しが見出しとして読める
- 段落が読みやすい
- ネスト list の構造が残っている
- 表が矩形で読みやすい
- 文書内リンクが出力済み anchor だけを指している
- 外部リンクが残っている
- 画像 placeholder または画像 link が読みやすい
- unsupported comment が不足内容の診断に使える程度に簡潔
- summary count が明らかにおかしくない

## CLI 確認

各文書で実行します。

```bash
npm run cli -- ./sample.docx --out ./sample.md --summary --summary-out ./sample.summary.txt
```

画像を含む文書では asset 出力も確認します。

```bash
npm run cli -- ./sample.docx --out ./sample.md --assets-dir ./sample.assets --summary --summary-out ./sample.summary.txt
```

診断用出力も確認します。

```bash
npm run cli -- ./sample.docx --out ./sample.debug.md --debug
```

確認観点:

- command が成功する
- Markdown file が作成される
- summary file が必要時に作成される
- asset directory が必要時に作成される
- asset export 時に `manifest.json` がある
- `manifest.json` に記録された画像 file が disk 上にある
- Markdown image link が export された asset path を指している

## triage 方針

実文書で問題を見つけたら、code を変える前に分類します。

- Bug: 対応済みのはずの構造が誤って変換されている
- Missing fixture: 期待挙動はあるが test が足りない
- Known limitation: source feature が現在の scope 外
- Documentation issue: 挙動は許容できるが説明が足りない

bug を直す場合は、できるだけ focused fixture test を追加します。

## release gate

release 前に実行します。

```bash
npm run build
npm run test:unit
```

あわせて確認します。

- README が現在の user-facing behavior と一致している
- `docs/usage.md` の例が現在も使える
- `index.html` と `miku-docx2md.html` が現在の source から生成されている
- private な検証用文書を commit していない
