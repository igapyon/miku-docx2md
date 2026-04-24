# docx2md Implementation Specification

## 1. Document Role

This document records the current implementation-aligned behavior of `docx2md`.

It complements:

- [README.md](../README.md)
  - entry document for users and readers
- [docx2md-spec.md](./docx2md-spec.md)
  - high-level specification and design policy
- [upstream.md](./upstream.md)
  - policy for referring to the sibling upstream app `miku-xlsx2md`

When implementation behavior differs from idealized design intent, this document should describe the implementation behavior explicitly.

## 2. Current Implementation Scope

The current first cut includes:

- in-house `.docx` ZIP entry reading
- XML DOM parsing utilities
- relationship resolution for document hyperlinks
- style-based and outline-level heading detection
- inline formatting for bold, italic, strike, underline, and paragraph-internal `<br>`
- external hyperlinks and document-internal hyperlinks
- nested lists based on `numbering.xml`
- structural table extraction
- merge placeholders `←M←` and `↑M↑`
- summary counts
- unsupported-element diagnostics
- Node.js CLI
- browser UI based on `lht-cmn/`

The current first cut still excludes:

- image extraction
- drawing / shape extraction
- exact layout reproduction
- header / footer, footnotes, comments, tracked changes

## 3. Overall Flow

The current end-to-end flow is:

1. read a `.docx` file as bytes
2. expand ZIP entries in-house
3. load `word/document.xml`
4. optionally load `word/_rels/document.xml.rels`, `word/styles.xml`, and `word/numbering.xml`
5. parse document blocks in document order
6. build a lightweight parsed document with `blocks` and `summary`
7. render Markdown
8. optionally emit summary text and unsupported debug comments

## 4. ZIP Handling

Current behavior:

- ZIP expansion is performed by the project code rather than by an external ZIP library
- required entries are looked up by normalized package path
- `word/document.xml` is mandatory
- missing optional entries fall back to empty behavior rather than immediate failure

If `word/document.xml` is missing, parsing fails with an explicit error.

## 5. XML Utilities

Current behavior:

- XML bytes are decoded as UTF-8 text
- parsing uses `DOMParser`
- lookup is based on `localName` rather than namespace prefix spelling
- helper functions exist for direct-child lookup, descendant lookup, and text extraction

Whitespace is not aggressively normalized at XML-read time. Most text normalization happens during inline extraction and Markdown rendering.

## 6. Relationship Resolution

Current behavior:

- `word/_rels/document.xml.rels` is parsed into a map keyed by relationship id
- external hyperlink targets are preserved as-is
- internal package targets are resolved relative to `word/document.xml`
- missing relationship ids do not fail the whole conversion
- unresolved internal anchors fall back to plain link text rather than emitting broken Markdown fragments

For hyperlink rendering:

- `r:id` with a known external relationship becomes an external Markdown link
- `r:id` with an internal fragment target becomes an internal Markdown link only when the normalized target matches a known bookmark owner
- missing or broken relationship ids fall back to plain link text unless a `w:anchor` target is available

## 7. Style and Heading Resolution

Current behavior:

- heading detection uses both paragraph style and outline level
- direct `Heading n` / `見出し n` recognition is supported
- style resolution walks the style chain returned by `styles.xml`
- style-chain heading names and outline levels are both considered
- paragraph-local `outlineLvl` acts as a fallback when style-based heading detection does not resolve a level
- cyclic `basedOn` chains are cut off safely during resolution

Heading levels are clamped to Markdown heading range `1..6`.

## 8. Inline Formatting

Current behavior:

- paragraph styles may contribute inherited text formatting
- paragraph-level direct run properties under `pPr/rPr` override inherited paragraph-style text formatting
- character styles referenced by `rStyle` may contribute inherited run formatting
- direct run formatting under `rPr` overrides both paragraph-derived and character-style-derived text formatting
- explicit `w:val="0"` / `false` on supported run-format flags disables inherited formatting for that scope
- run formatting supports bold, italic, strike, and underline
- wrapper order is:
  - underline
  - strike
  - italic
  - bold
- paragraph-internal `w:br` becomes `<br>`
- tabs are normalized to four spaces
- repeated spaces are compacted during inline normalization
- surrounding whitespace is trimmed at the resulting inline string level

Hyperlink text suppresses underline wrapping so that link syntax is not nested with underline output.

## 9. Hyperlinks and Anchors

Current behavior:

- external hyperlinks render as `[text](url)`
- internal hyperlinks with `w:anchor` render as `[text](#anchor)` only when the normalized anchor matches a known bookmark owner
- internal hyperlinks with relationship fragment targets such as `#anchor` follow the same known-anchor check
- paragraph bookmarks from `bookmarkStart` are collected as block anchor ids
- known-anchor resolution is limited to top-level document paragraphs that can emit block anchors
- duplicate normalized bookmark anchors are emitted only for the first owning block
- bookmark names starting with `_` are ignored
- known paragraph bookmarks render as HTML anchors before the block:
  - `<a id="anchor"></a>`
- anchor normalization trims whitespace, lowercases, collapses spaces to `-`, replaces unsupported punctuation with `-`, and collapses repeated `-`
- the same normalization is applied to bookmark owners and internal hyperlink targets so links remain aligned

## 10. Numbering and Lists

Current behavior:

- `numbering.xml` is parsed into `abstractNum` and `num` mappings
- `numId` and `ilvl` are used to determine list kind and nesting depth
- bullet-like numbering becomes `-`
- ordered numbering becomes `1.`
- indentation width is `4 spaces` per nesting level

If numbering metadata cannot be resolved, the paragraph falls back to ordinary paragraph behavior rather than forcing a synthetic list.

## 11. Tables

Current behavior:

- tables are parsed in document order
- each row is read from `w:tr`
- each cell is read from `w:tc`
- cell text is built from paragraph content
- multiple paragraphs inside a cell are joined by `<br><br>`
- heading-like paragraphs inside table cells are preserved as simplified heading text such as `## Heading`
- list paragraphs inside table cells are preserved as simplified inline list text using `-` or `1.`
- nested list depth inside table cells is represented with repeated `&nbsp;&nbsp;&nbsp;&nbsp;`
- horizontal merge placeholders use `←M←`
- vertical merge continuation placeholders use `↑M↑`
- additional horizontally spanned cells inside a vertical continuation row use `←M←`
- shorter rows are padded with empty cells so the Markdown table stays rectangular

Markdown rendering uses the first row as the header row.

## 12. Markdown Rendering

Current behavior:

- paragraphs render as plain Markdown blocks
- headings render as `#` through `######`
- list items render with bullet or ordered markers and 4-space nesting
- tables render as Markdown tables
- unsupported blocks are omitted by default
- unsupported blocks render as HTML comments only when debug-style output is enabled

Anchor rendering is inserted immediately before the owning paragraph, heading, or list item block.

## 13. Summary and Diagnostics

Current summary fields are:

- `paragraphs`
- `headings`
- `listItems`
- `tables`
- `images`
- `imageAssets`
- `drawingLikeUnsupported`
- `links`
- `internalLinks`
- `externalLinks`
- `unsupportedElements`
- `unsupportedCommentTraces`

`unsupportedCommentTraces` currently counts both standalone unsupported blocks and unsupported traces attached to supported blocks.

Unsupported element traces currently use a small normalized category set for common cases:

- `drawing` for drawing-like elements such as `drawing`, `pict`, and `object`
- `textbox` for textbox-like elements such as `txbxContent`
- `chart` for `chart`
- otherwise the raw `localName` is used

When unsupported traces are rendered as debug HTML comments, comment-breaking sequences from source metadata are sanitized so the debug output does not prematurely close the comment.

For drawing-like unsupported elements, when an embedded image relationship can be resolved safely, the current debug trace may include the package target in a form such as:

- `drawing:image(word/media/example.png)`

When drawing metadata exposes image alt text through attributes such as `descr` or `title`, the current debug trace may append that metadata in a form such as:

- `drawing:image(word/media/example.png):alt(Example alt text)`

Image trace parsing preserves alt text that contains ordinary parentheses.

When drawing metadata exposes `wp:extent`, the current debug trace may append the EMU size in a form such as:

- `drawing:image(word/media/example.png):size-emu(914400x457200)`

When unsupported content is found inside a supported paragraph or table, the trace is attached to that owning block and rendered as an adjacent HTML comment only in debug-style output.

Current textbox handling is a limited compromise:

- `txbxContent` nested inside a supported block may contribute plain extracted paragraph text
- textbox paragraphs inside that extracted content may still be simplified as heading-like text or inline list-like text
- textbox layout, positioning, and shape semantics remain unsupported

Current image handling is also a limited compromise:

- normal Markdown output still does not embed extracted image files automatically
- when meaningful image alt text is available, normal Markdown may include a lightweight placeholder such as `[Image: Example alt text]`
- debug-style output still emits the fuller unsupported trace with relationship target and any available metadata
- the current Node-facing parse result may expose resolved embedded image package entries as `assets`
- the current CLI may export those resolved embedded image assets when `--assets-dir <dir>` is specified
- when `--assets-dir <dir>` is used, the current CLI also switches image placeholders to relative Markdown image links when an alt text is available
- generated Markdown image destinations are percent-escaped for characters that would otherwise break inline Markdown links, such as spaces and parentheses
- generated Markdown image alt text is collapsed to one line, and square brackets are removed only for image-link syntax
- the current asset metadata prefers `[Content_Types].xml` declarations when available and falls back to extension-based media-type inference otherwise
- current asset exports also include `manifest.json` with asset path, media type, alt text, byte size, originating unsupported trace, owning block index, and a finer `documentPosition` object with block kind and per-block trace index

## 14. Browser UI and CLI

### 14.1 Browser UI

Current browser UI behavior:

- uses `lht-cmn/` as the shared component base
- keeps `index.html` as the landing page and `miku-docx2md.html` as the conversion app page
- uses `lht-page-hero`, `lht-file-select`, `lht-switch-help`, `lht-preview-output`, `lht-loading-overlay`, `lht-error-alert`, and `lht-toast`
- allows file selection first and explicit conversion second
- supports Markdown save and summary save
- supports image-asset ZIP save when resolved embedded image assets are available
- browser image-asset ZIP export writes stored ZIP entries with CRC32 values and the UTF-8 filename flag
- uses `lht-preview-output` built-in copy actions for preview text
- toggles unsupported HTML comments via a switch

Page-local CSS lives in `src/css/app.css`.

### 14.2 Node.js CLI

Current CLI options include:

- `--out <file>`
- `--assets-dir <dir>`
- `--summary`
- `--summary-out <file>`
- `--debug`
- `--include-unsupported-comments`
- `--help`

`--debug` and `--include-unsupported-comments` currently enable the same Markdown behavior.

## 15. Open Items

The main remaining implementation questions are:

- no major open items are currently recorded in this document
