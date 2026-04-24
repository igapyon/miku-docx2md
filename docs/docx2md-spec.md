# docx2md Specification

## 1. Document Overview

`docx2md` is a tool that reads Word documents in `.docx` format and converts their textual structure into Markdown.

The goal is not to reproduce the visual appearance of Microsoft Word documents exactly.
The goal is to extract document structure and meaningful text in a form that is easy for humans to read and easy for generative AI systems to consume.

This tool should be designed as:

- `Word document structure extraction -> Markdown`

not simply:

- `Word appearance reproduction -> Markdown`

This document describes the high-level specification and design policy.
Implementation-specific behavior should be documented separately in an implementation specification once the first cut exists.

## 2. Scope

### 2.1 Supported Input

- `.docx`

### 2.2 Unsupported Input

The first cut does not target:

- `.doc`
- `.rtf`
- `.odt`
- pasted rich text or clipboard input

### 2.3 Supported Content in First Cut

The first cut should focus on textual and structural content that maps cleanly into Markdown.

- paragraphs
- headings
- inline text runs
- bold / italic / strike / underline
- line breaks inside paragraphs
- hyperlinks
- bullet lists
- numbered lists
- tables

### 2.4 Out of Scope in First Cut

The first cut intentionally excludes visual and layout-heavy features.

- images
- shapes
- SmartArt
- WordArt
- text boxes
- floating objects
- charts
- drawing objects
- exact page layout reproduction
- headers / footers
- footnotes / endnotes
- comments
- tracked changes
- macros

These may be considered later, but should not complicate the first implementation.

## 3. Target Documents

`docx2md` primarily targets document-style inputs whose main value is in the written content and document hierarchy.

- specifications
- design documents
- manuals
- reports
- meeting notes
- narrative business documents

## 4. Design Principles

### 4.1 Output Purpose

The Markdown output should aim to satisfy the following:

- easy for humans to read
- easy for generative AI to process
- preserves meaningful structure
- preserves document order
- preserves enough source traceability to understand where content came from

### 4.2 Conversion Policy

- prioritize semantic structure over visual fidelity
- preserve document reading order
- map Word structure into ordinary Markdown where reasonable
- prefer stable and predictable output over aggressive interpretation
- keep the first cut small and testable
- prioritize features that can be expressed naturally in GitHub-compatible Markdown / HTML
- do not force representation for features that do not fit GitHub-compatible Markdown / HTML naturally

In other words, the conversion policy is:

- if a Word feature can be represented reasonably in GitHub-compatible Markdown / HTML, preserve it
- if it cannot be represented reasonably in that range, do not preserve it in the first cut

This is a deliberate output policy, not merely an implementation limitation.

### 4.3 Relationship to `miku-xlsx2md`

`docx2md` may reuse ideas from the sibling app `miku-xlsx2md`, especially:

- documentation structure
- separation of core logic and UI
- browser-first local processing
- optional CLI alignment
- test-first implementation style
- ZIP container handling approach
- XML parsing style
- TypeScript-first source management
- single-file web app packaging direction where practical
- `lht-cmn/` based browser UI composition

Unless there is a clear `docx`-specific reason to differ, `docx2md` should imitate `miku-xlsx2md` in overall repository structure, implementation style, naming discipline, test style, and browser/runtime separation.
For browser UI, `docx2md` should treat `lht-cmn/` as the primary shared component layer and should prefer `lht-*` components over page-local widget implementations unless there is a clear reason to differ.

However, `docx2md` should not inherit spreadsheet-specific behavior.
There is no table-region detection problem equivalent to Excel sheet analysis.
The main parsing targets are document order, paragraph style, numbering, runs, and tables.

### 4.4 File and Module Split Policy

The source file split should also imitate `miku-xlsx2md` where practical.

- use `src/ts/` as the source-of-truth implementation directory
- keep generated `src/js/` output separate from TypeScript source
- keep `main.ts` as the browser UI entry point
- keep `core.ts` as the central conversion orchestration layer
- split helper logic into small focused modules instead of concentrating everything in one large parser file

The split should remain reasonable for the smaller `docx` scope.
It is not necessary to copy the spreadsheet app file count mechanically, but the same style should be followed:

- ZIP handling in a dedicated module such as `zip-io.ts`
- XML helper functions in a dedicated module such as `xml-utils.ts`
- relationship parsing in a dedicated module such as `rels-parser.ts`
- style parsing in a dedicated module such as `styles-parser.ts`
- numbering/list parsing in a dedicated module
- document parsing in a dedicated module
- Markdown rendering and export helpers in dedicated modules

In short, prefer modest responsibility-based file splitting over monolithic implementation files, while avoiding artificial fragmentation.

## 5. Output Unit and File Structure

### 5.1 Output Unit

The first cut should treat one `.docx` file as one input and produce one Markdown document as the primary output.

### 5.2 Default Output

The primary output should be:

- one combined Markdown file

Since images and shapes are out of scope in the first cut, ZIP export is not required initially.

### 5.3 Naming

The default output file name should be based on the input document name.

Example:

- input: `design.docx`
- output: `design.md`

## 6. Parsing Model

### 6.1 Container Handling

A `.docx` file should be treated as a ZIP package.

As with `miku-xlsx2md`, ZIP expansion should be implemented in-house from scratch rather than delegated to an external ZIP library.
The implementation should follow the same general direction as the sibling app:

- read the package as raw bytes
- parse ZIP headers directly
- enumerate entries in a predictable way
- decode required XML entries from the extracted byte data
- keep the ZIP handling layer separate from document parsing

This is intended to preserve architectural consistency with `miku-xlsx2md` and keep the core parsing stack understandable and testable.

The first cut should read at least the following package entries when present:

- `word/document.xml`
- `word/_rels/document.xml.rels`
- `word/styles.xml`
- `word/numbering.xml`

### 6.2 Core Internal Model

The internal model may remain small in the first cut.

- document
- paragraph
- run
- hyperlink
- list item
- table
- table row
- table cell

The first cut may also keep lightweight internal metadata for:

- bookmark or anchor targets
- internal and external hyperlink targets
- unsupported element diagnostics

### 6.3 Reading Order

The parser should preserve the document order found in `word/document.xml`.
This is the primary structural axis for `docx2md`.

## 7. Markdown Conversion Rules

### 7.1 Paragraphs

- ordinary paragraphs become plain Markdown paragraphs
- empty paragraphs may act as paragraph separators

### 7.2 Headings

- heading-like paragraph styles should map to Markdown headings
- `Heading 1` -> `#`
- `Heading 2` -> `##`
- `Heading 3` -> `###`
- deeper levels may continue similarly

Heading detection in the first cut should use both paragraph style information and outline level information.
This combined approach is more robust than relying on only one of them.

Recommended priority:

1. heading-equivalent paragraph style
2. outline level
3. otherwise treat as a normal paragraph

More specifically:

- first resolve the paragraph style through `pStyle` and `styles.xml`
- if the resolved style is a built-in heading-equivalent style, use that heading level
- if the style does not resolve to a heading but the paragraph has a valid outline level, use the outline level
- if neither indicates a heading, do not treat the paragraph as a heading

For compatibility, heading recognition should not depend only on display labels.
The implementation should prefer structural identifiers such as `styleId` and resolved style definitions.
Localized style names may be used only as a compatibility aid.

First-cut compatibility should include at least the following heading-style families when they can be identified safely:

- `Heading 1` to `Heading 6`
- `見出し 1` to `見出し 6`

Heading level mapping should be:

- level 1 -> `#`
- level 2 -> `##`
- level 3 -> `###`
- level 4 -> `####`
- level 5 -> `#####`
- level 6 or deeper -> `######`

The first cut should not infer headings only from appearance.
The following alone are not enough to classify a paragraph as a heading:

- larger font size
- bold text
- centered alignment
- spacing before or after the paragraph

### 7.3 Inline Formatting

- bold -> `**text**`
- italic -> `*text*`
- strike -> `~~text~~`
- underline -> `<ins>text</ins>`
- paragraph-internal line breaks -> `<br>`

When multiple inline styles apply to the same text, the rendering order should follow the sibling-app approach for deterministic output.
Recommended wrapper application order is:

1. underline
2. strike
3. italic
4. bold

This means the final visible output places `bold` outermost when all four styles are active.

### 7.4 Hyperlinks

- external links should become Markdown links when possible
- format: `[text](url)`
- document-internal links should become `[text](#anchor)` when the target anchor is known
- when a paragraph owns a bookmark target, the Markdown output may emit a lightweight HTML anchor such as `<a id="anchor"></a>` immediately before the block
- internal anchor names should be normalized into stable fragment-safe ids
- recommended normalization is: trim, lowercase, collapse whitespace to `-`, replace unsupported punctuation with `-`, and collapse repeated `-`
- unresolved internal links should fall back to plain link text rather than emitting a broken Markdown target
- when hyperlink text also has underline formatting, GitHub output does not need to add extra underline markup on top of the link
- document-internal links should also be preserved when the target can be resolved safely
- a resolved internal link may render as `[text](#anchor)`
- if an internal target cannot be resolved reliably, the implementation may fall back to plain text rather than emitting a broken link

### 7.5 Lists

- bullet lists should become `- item`
- numbered lists should become `1. item`
- nested lists are required in the first cut

List handling in the first cut should use `numbering.xml` and paragraph numbering properties as the primary structural source.
The implementation should not rely on visual indentation alone.

The first cut should support at least:

- bullet lists
- numbered lists
- nested lists
- mixed nesting where a bullet list contains a numbered list or vice versa

Recommended interpretation order:

1. resolve the paragraph numbering reference from the paragraph properties
2. resolve the numbering instance through `numId`
3. resolve the abstract numbering definition
4. use the paragraph level such as `ilvl` to determine nesting depth
5. use the numbering definition to distinguish bullet-style and ordered-style items

Markdown rendering policy:

- unordered items should render as `- item`
- ordered items should render as `1. item`
- nested items should be indented in Markdown according to their nesting depth
- the output should prefer stable Markdown readability over reproducing Word numbering glyphs exactly

The first cut does not need to reproduce every numbering style variation exactly.
For example, the following may be normalized while still preserving list structure:

- `1.` / `1)` / `a.` / `A.` / `i.` / `I.`
- localized numbering markers
- custom bullet glyphs

In such cases, preserving ordered vs unordered structure and nesting depth is more important than preserving the exact marker text.

The first cut should also define clear limits:

- list detection should be based on numbering structure, not indentation width alone
- paragraphs without list structure should not be converted into lists only because they are visually indented
- if numbering metadata is broken or incomplete, the implementation may fall back to a plain paragraph instead of inventing list structure

### 7.6 Tables

- simple Word tables should become Markdown tables
- table extraction is structural, not visual
- line breaks inside table cells should become `<br>`

Merged cells should be simplified in the first cut using explicit merge placeholders rather than attempting HTML table reproduction.

Recommended merge rendering policy:

- the origin cell of a merge keeps its actual content
- a horizontally absorbed cell should render as `←M←`
- otherwise, a vertically absorbed cell should render as `↑M↑`

In other words, merge placeholder priority should be:

1. if there is a parent cell on the left, use `←M←`
2. otherwise, if there is a parent cell above, use `↑M↑`

Additional first-cut table rules:

- the Markdown table column count should follow the Word table grid as parsed
- the implementation should preserve table structure rather than attempting pixel-equivalent layout reproduction
- the first cut should not switch to raw HTML table output just to preserve merge layout

### 7.7 Line Break and Whitespace Normalization

Line break and whitespace normalization should prioritize stable Markdown output over layout-oriented fidelity.

Document/block-level rules:

- ordinary paragraphs should be separated by one blank line
- headings should be separated from surrounding blocks by one blank line
- tables should be separated from surrounding blocks by one blank line
- consecutive empty paragraphs with no meaningful content should be compressed into a single paragraph break
- leading empty paragraphs at the start of a document may be removed
- trailing empty paragraphs at the end of a document may be removed

Paragraph-level rules:

- explicit paragraph-internal line breaks should render as `<br>`
- multiple explicit line breaks may remain as repeated `<br>`
- paragraph text should be trimmed at both ends before final Markdown emission
- run boundaries should not insert guessed spaces automatically

Whitespace normalization rules:

- tabs should normalize to four spaces
- repeated ordinary spaces may be normalized to a single space in normal prose output
- normalization should preserve intentionally explicit line break structure
- whitespace normalization should favor deterministic output and test stability

Cell-level rules:

- a line break inside a table-cell paragraph should render as `<br>`
- multiple paragraphs inside one table cell may be joined using `<br><br>`
- table-cell text should be trimmed at both ends before final Markdown emission
- when a table-cell paragraph is structurally a list item, the output may preserve it as simplified inline list text such as `- item` or `1. item`
- nested list depth inside table cells may be represented with lightweight indentation rather than full block Markdown structure

List-item text should follow the same general normalization policy as ordinary paragraphs unless a later implementation section defines a narrower exception.

### 7.8 Style Resolution Depth

The first cut should resolve only the style layers needed for structural extraction and supported inline formatting.

Recommended priority order:

1. direct formatting on the paragraph or run
2. character style
3. paragraph style
4. inherited style chain via `basedOn`

Style resolution should be deep enough to support at least:

- heading detection
- bold
- italic
- strike
- underline
- list-related paragraph structure when style metadata is relevant

The first cut does not need to resolve every style-related visual detail.
It should prioritize structure and supported Markdown-facing emphasis rather than Word layout fidelity.

Implementation safety rules:

- `basedOn` chains may be followed recursively
- cyclic style references should be detected and cut off safely
- broken or missing style references should fall back gracefully to the next available source of information

## 8. Error and Fallback Policy

- unsupported visual features should be ignored rather than breaking the whole conversion
- parsing should fail clearly for invalid `.docx` inputs
- when a structure cannot be represented faithfully in Markdown, prefer a simple stable fallback
- when a Word feature does not map naturally to the supported GitHub-compatible Markdown/HTML subset, omission is preferable to awkward pseudo-reproduction

This includes a deliberate output-policy compromise similar to `miku-xlsx2md`:

- some rich text and display formatting should be preserved only when they fall naturally into GitHub-compatible Markdown / HTML
- formatting that does not fall naturally into that range should not be forced into artificial pseudo-syntax

Unsupported elements may leave an HTML comment trace in the Markdown when that helps preserve document understanding without heavily disturbing readability.
However, this should be disabled by default in normal output.

Recommended first-cut fallback policy for unsupported elements:

- unsupported elements should not usually become visible prose in the Markdown body
- by default, unsupported elements should be omitted from the Markdown body
- when a debug-oriented switch is enabled, unsupported elements may be represented by lightweight HTML comments
- HTML comment traces should remain concise and diagnostic rather than verbose

The first cut may expose this through a dedicated option such as:

- `--debug`
- `--include-unsupported-comments`

The exact option name may be finalized later, but the policy should be:

- default output: no unsupported-element HTML comments
- debug-oriented output: unsupported-element HTML comments allowed

Examples of acceptable fallback direction:

- `<!-- unsupported: drawing -->`
- `<!-- unsupported: textbox -->`
- `<!-- unsupported: chart -->`

The first cut should prefer concise comment traces over large raw XML dumps or long explanatory blocks.

## 9. Summary and Diagnostics

The first cut should maintain a lightweight conversion summary and unsupported-element diagnostics, following the general sibling-app philosophy of keeping conversion behavior observable.

Recommended summary items include at least:

- paragraphs
- headings
- listItems
- tables
- links
- internalLinks
- externalLinks
- unsupportedElements
- unsupportedCommentTraces

## 10. First-Cut Test Coverage

The first cut should be validated primarily through fixture-based tests.
The fixture set should be small but intentionally representative of the supported feature boundaries.

Recommended first-cut coverage includes at least:

- plain paragraph extraction
- heading detection from paragraph style and/or outline level
- inline formatting for bold, italic, strike, and underline
- explicit line breaks rendered as `<br>`
- external hyperlink extraction
- internal hyperlink extraction when the anchor target is resolvable
- bullet list extraction
- numbered list extraction
- nested list extraction
- mixed nested list extraction
- simple table extraction
- merged-cell placeholder rendering with `←M←` and `↑M↑`
- table-cell line breaks rendered as `<br>`
- unsupported objects leaving concise HTML comment traces when the debug-oriented switch is enabled
- graceful fallback when unresolved internal links or broken numbering/style metadata are encountered

The first-cut test set should prioritize deterministic Markdown output.
Tests should prefer exact-output assertions for stable representative fixtures whenever practical.

## 11. Runtime and Packaging Direction

The intended direction is to follow the sibling app style where practical.

- local processing
- browser-capable implementation
- TypeScript as source of truth
- testable core logic

CLI support may be added later, but it does not need to block the first cut.

## 12. Initial Development Priorities

Recommended implementation order:

1. ZIP entry reading for `.docx`
2. plain paragraph extraction
3. inline run formatting
4. headings
5. hyperlinks
6. lists via numbering
7. tables
8. summary and tests
