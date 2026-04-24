# Upstream Reference Policy

## Purpose

This repository develops `miku-docx2md` while referring to the sibling app `miku-xlsx2md` as an upstream design and implementation reference.

## Upstream Repository

The primary upstream reference is the Git clone placed at:

- `workplace/miku-xlsx2md`

Its origin is:

- `https://github.com/igapyon/miku-xlsx2md`

When reviewing architecture, documentation style, file layout, build scripts, or test strategy, prefer this clone as the canonical sibling reference.

## Intended Usage

- Read `workplace/miku-xlsx2md` first when considering `miku-docx2md` specifications.
- Reuse compatible ideas such as documentation structure, core/UI separation, CLI alignment, and test strategy.
- Do not assume `xlsx`-specific logic is directly reusable for `docx`; use it as a sibling reference, not as a direct specification.

## Scope Note

For `miku-docx2md` first cut, images and shapes are out of scope even though the upstream sibling app handles richer asset extraction in the spreadsheet domain.
