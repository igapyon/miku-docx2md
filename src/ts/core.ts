/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const zipIo = moduleRegistry.getModule<{
    unzipEntries: (arrayBuffer: ArrayBuffer) => Promise<Map<string, Uint8Array>>;
  }>("zipIo");
  const documentParser = moduleRegistry.getModule<{
    parseDocumentXml: (
      documentXmlBytes: Uint8Array,
      relationshipsBytes?: Uint8Array,
      stylesBytes?: Uint8Array,
      numberingBytes?: Uint8Array
    ) => { blocks: Array<
      { kind: "paragraph" | "heading" | "listItem"; text: string; level?: number; listKind?: "bullet" | "ordered"; indent?: number; anchorIds?: string[] }
      | { kind: "unsupported"; type: string }
      | { kind: "table"; rows: string[][] }
    >; summary: {
      paragraphs: number;
      headings: number;
      listItems: number;
      tables: number;
      links: number;
      internalLinks: number;
      externalLinks: number;
      unsupportedElements: number;
    } };
  }>("documentParser");

  async function parseDocx(arrayBuffer: ArrayBuffer): Promise<{ blocks: Array<
    { kind: "paragraph" | "heading" | "listItem"; text: string; level?: number; listKind?: "bullet" | "ordered"; indent?: number; anchorIds?: string[] }
    | { kind: "unsupported"; type: string }
    | { kind: "table"; rows: string[][] }
  >; summary: {
    paragraphs: number;
    headings: number;
    listItems: number;
    tables: number;
    links: number;
    internalLinks: number;
    externalLinks: number;
    unsupportedElements: number;
  } }> {
    const files = await zipIo?.unzipEntries(arrayBuffer);
    if (!files) {
      throw new Error("ZIP module is not loaded.");
    }
    const documentXmlBytes = files.get("word/document.xml");
    if (!documentXmlBytes) {
      throw new Error("word/document.xml was not found.");
    }
    const relationshipsBytes = files.get("word/_rels/document.xml.rels");
    const stylesBytes = files.get("word/styles.xml");
    const numberingBytes = files.get("word/numbering.xml");
    return documentParser?.parseDocumentXml(documentXmlBytes, relationshipsBytes, stylesBytes, numberingBytes) || {
      blocks: [],
      summary: {
        paragraphs: 0,
        headings: 0,
        listItems: 0,
        tables: 0,
        links: 0,
        internalLinks: 0,
        externalLinks: 0,
        unsupportedElements: 0
      }
    };
  }

  function escapeTableCell(text: string): string {
    return String(text || "").replace(/\|/g, "\\|");
  }

  function renderTable(rows: string[][]): string {
    if (!rows.length) return "";
    const header = rows[0];
    const separator = header.map(() => "---");
    const bodyRows = rows.slice(1);
    return [
      `| ${header.map((cell) => escapeTableCell(cell)).join(" | ")} |`,
      `| ${separator.join(" | ")} |`,
      ...bodyRows.map((row) => `| ${row.map((cell) => escapeTableCell(cell)).join(" | ")} |`)
    ].join("\n");
  }

  function renderAnchors(anchorIds?: string[]): string {
    if (!anchorIds || anchorIds.length === 0) return "";
    return anchorIds.map((anchorId) => `<a id="${String(anchorId)}"></a>`).join("\n");
  }

  function renderMarkdown(
    parsedDocument: {
      blocks: Array<
        { kind: "paragraph" | "heading" | "listItem"; text: string; level?: number; listKind?: "bullet" | "ordered"; indent?: number; anchorIds?: string[] }
        | { kind: "unsupported"; type: string }
        | { kind: "table"; rows: string[][] }
      >;
    },
    options?: {
      includeUnsupportedComments?: boolean;
    }
  ): string {
    const includeUnsupportedComments = !!options?.includeUnsupportedComments;
    return parsedDocument.blocks
      .map((block) => {
        if (block.kind === "table") {
          return renderTable(block.rows);
        }
        if (block.kind === "unsupported") {
          return includeUnsupportedComments ? `<!-- unsupported: ${block.type} -->` : "";
        }
        if (block.kind === "heading") {
          const anchors = renderAnchors(block.anchorIds);
          const headingLine = `${"#".repeat(Math.max(1, Math.min(block.level || 1, 6)))} ${block.text}`;
          return anchors ? `${anchors}\n${headingLine}` : headingLine;
        }
        if (block.kind === "listItem") {
          const indent = "    ".repeat(Math.max(0, block.indent || 0));
          const marker = block.listKind === "ordered" ? "1." : "-";
          const listLine = `${indent}${marker} ${block.text}`;
          const anchors = renderAnchors(block.anchorIds);
          return anchors ? `${anchors}\n${listLine}` : listLine;
        }
        const anchors = renderAnchors(block.anchorIds);
        return anchors ? `${anchors}\n${block.text}` : block.text;
      })
      .filter((block) => block !== "")
      .join("\n\n");
  }

  function createSummary(parsedDocument: {
    summary: {
      paragraphs: number;
      headings: number;
      listItems: number;
      tables: number;
      links: number;
      internalLinks: number;
      externalLinks: number;
      unsupportedElements: number;
    };
  }): { paragraphs: number; headings: number; listItems: number; tables: number; links: number; internalLinks: number; externalLinks: number; unsupportedElements: number; unsupportedCommentTraces: number } {
    return {
      ...parsedDocument.summary,
      unsupportedCommentTraces: parsedDocument.summary.unsupportedElements
    };
  }

  function createSummaryText(parsedDocument: {
    summary: {
      paragraphs: number;
      headings: number;
      listItems: number;
      tables: number;
      links: number;
      internalLinks: number;
      externalLinks: number;
      unsupportedElements: number;
    };
  }): string {
    const summary = createSummary(parsedDocument);
    return [
      `paragraphs: ${summary.paragraphs}`,
      `headings: ${summary.headings}`,
      `listItems: ${summary.listItems}`,
      `tables: ${summary.tables}`,
      `links: ${summary.links}`,
      `internalLinks: ${summary.internalLinks}`,
      `externalLinks: ${summary.externalLinks}`,
      `unsupportedElements: ${summary.unsupportedElements}`,
      `unsupportedCommentTraces: ${summary.unsupportedCommentTraces}`
    ].join("\n");
  }

  moduleRegistry.registerModule("docx2md", {
    parseDocx,
    renderMarkdown,
    createSummary,
    createSummaryText
  });
})();
