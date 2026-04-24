/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const xmlUtils = moduleRegistry.getModule<{
    parseXml: (bytes: Uint8Array) => Document;
    getChildrenByLocalName: (parent: ParentNode, localName: string) => Element[];
    findDescendantsByLocalName: (parent: ParentNode, localName: string) => Element[];
    getTextContent: (node: Node | null | undefined) => string;
  }>("xmlUtils");
  const relsParser = moduleRegistry.getModule<{
    parseRelationships: (bytes: Uint8Array, sourcePath: string) => Map<string, { target: string; type: string; mode: string }>;
  }>("relsParser");
  const stylesParser = moduleRegistry.getModule<{
    parseStyles: (bytes?: Uint8Array) => Map<string, { styleId: string; name: string; basedOn: string; outlineLevel: number | null }>;
    resolveStyleChain: (
      styles: Map<string, { styleId: string; name: string; basedOn: string; outlineLevel: number | null }>,
      styleId: string
    ) => Array<{ styleId: string; name: string; basedOn: string; outlineLevel: number | null }>;
  }>("stylesParser");
  const numberingParser = moduleRegistry.getModule<{
    parseNumbering: (bytes?: Uint8Array) => {
      abstractNums: Map<string, { abstractNumId: string; levels: Map<number, { level: number; format: string; text: string }> }>;
      nums: Map<string, string>;
    };
    resolveListKind: (
      numbering: {
        abstractNums: Map<string, { abstractNumId: string; levels: Map<number, { level: number; format: string; text: string }> }>;
        nums: Map<string, string>;
      },
      numId: string,
      ilvl: number
    ) => "bullet" | "ordered" | null;
  }>("numberingParser");

  type ParsedStyle = {
    bold: boolean;
    italic: boolean;
    strike: boolean;
    underline: boolean;
  };

  type ParsedParagraph = {
    kind: "paragraph" | "heading" | "listItem";
    text: string;
    level?: number;
    listKind?: "bullet" | "ordered";
    indent?: number;
    anchorIds?: string[];
  };

  type ParsedTable = {
    kind: "table";
    rows: string[][];
  };

  type ParsedUnsupported = {
    kind: "unsupported";
    type: string;
  };

  type ParsedSummary = {
    paragraphs: number;
    headings: number;
    listItems: number;
    tables: number;
    links: number;
    internalLinks: number;
    externalLinks: number;
    unsupportedElements: number;
  };

  type ParsedDocument = {
    blocks: Array<ParsedParagraph | ParsedTable | ParsedUnsupported>;
    summary: ParsedSummary;
  };

  type ParseContext = {
    summary: ParsedSummary;
  };

  function hasEnabledElement(parent: Element | null, localName: string): boolean {
    if (!parent) return false;
    const element = xmlUtils?.getChildrenByLocalName(parent, localName)[0] || null;
    if (!element) return false;
    const value = element.getAttribute("w:val") || element.getAttribute("val") || "";
    return value !== "false" && value !== "0";
  }

  function applyTextStyle(text: string, style: ParsedStyle): string {
    if (!text) return "";
    let result = text;
    if (style.underline) result = `<ins>${result}</ins>`;
    if (style.strike) result = `~~${result}~~`;
    if (style.italic) result = `*${result}*`;
    if (style.bold) result = `**${result}**`;
    return result;
  }

  function mergeStyle(base: ParsedStyle, override: ParsedStyle): ParsedStyle {
    return {
      bold: base.bold || override.bold,
      italic: base.italic || override.italic,
      strike: base.strike || override.strike,
      underline: base.underline || override.underline
    };
  }

  function readRunStyle(runElement: Element): ParsedStyle {
    const properties = xmlUtils?.getChildrenByLocalName(runElement, "rPr")[0] || null;
    return {
      bold: hasEnabledElement(properties, "b"),
      italic: hasEnabledElement(properties, "i"),
      strike: hasEnabledElement(properties, "strike"),
      underline: hasEnabledElement(properties, "u")
    };
  }

  function normalizeInlineText(text: string): string {
    return text.replace(/\t/g, "    ").replace(/ {2,}/g, " ").trim();
  }

  function recordUnsupported(context: ParseContext, type: string): ParsedUnsupported {
    context.summary.unsupportedElements += 1;
    return {
      kind: "unsupported",
      type
    };
  }

  function normalizeAnchorName(name: string): string {
    const normalized = String(name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9._:-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[-:.]+|[-:.]+$/g, "");
    return normalized;
  }

  function extractParagraphAnchors(paragraph: Element): string[] {
    const anchors: string[] = [];
    const bookmarks = xmlUtils?.findDescendantsByLocalName(paragraph, "bookmarkStart") || [];
    for (const bookmark of bookmarks) {
      const rawName = (bookmark.getAttribute("w:name") || bookmark.getAttribute("name") || "").trim();
      if (!rawName || rawName.startsWith("_")) continue;
      const normalizedName = normalizeAnchorName(rawName);
      if (!normalizedName) continue;
      if (!anchors.includes(normalizedName)) {
        anchors.push(normalizedName);
      }
    }
    return anchors;
  }

  function extractTextRuns(
    paragraph: Element,
    relationships: Map<string, { target: string; type: string; mode: string }>,
    context: ParseContext,
    inheritedStyle: ParsedStyle = { bold: false, italic: false, strike: false, underline: false },
    suppressUnderline: boolean = false
  ): string {
    const pieces: string[] = [];
    for (const child of Array.from(paragraph.childNodes || [])) {
      if (child.nodeType !== 1) continue;
      const element = child as Element;
      if (element.localName === "r") {
        const style = mergeStyle(inheritedStyle, readRunStyle(element));
        const effectiveStyle = suppressUnderline ? { ...style, underline: false } : style;
        const textElements = xmlUtils?.getChildrenByLocalName(element, "t") || [];
        for (const textElement of textElements) {
          pieces.push(applyTextStyle(xmlUtils?.getTextContent(textElement) || "", effectiveStyle));
        }
        const breakElements = xmlUtils?.getChildrenByLocalName(element, "br") || [];
        if (breakElements.length > 0) {
          pieces.push("<br>".repeat(breakElements.length));
        }
      } else if (element.localName === "hyperlink") {
        const linkText = extractTextRuns(element, relationships, context, inheritedStyle, true);
        const relationshipId = element.getAttribute("r:id") || "";
        const anchor = normalizeAnchorName(element.getAttribute("w:anchor") || element.getAttribute("anchor") || "");
        if (relationshipId && relationships.has(relationshipId)) {
          context.summary.links += 1;
          context.summary.externalLinks += 1;
          pieces.push(`[${linkText}](${relationships.get(relationshipId)?.target || ""})`);
        } else if (anchor) {
          context.summary.links += 1;
          context.summary.internalLinks += 1;
          pieces.push(`[${linkText}](#${anchor})`);
        } else {
          pieces.push(linkText);
        }
      } else if (element.localName === "bookmarkStart" || element.localName === "bookmarkEnd" || element.localName === "pPr") {
        continue;
      } else {
        context.summary.unsupportedElements += 1;
      }
    }
    return normalizeInlineText(pieces.join(""));
  }

  function isHeadingName(name: string): number | null {
    const match = /^(Heading|見出し)\s*([1-6])$/i.exec(name.trim());
    if (!match) return null;
    return Number.parseInt(match[2], 10);
  }

  function getHeadingLevel(
    paragraph: Element,
    styles: Map<string, { styleId: string; name: string; basedOn: string; outlineLevel: number | null }>
  ): number | null {
    const paragraphProperties = xmlUtils?.getChildrenByLocalName(paragraph, "pPr")[0] || null;
    if (!paragraphProperties) return null;
    const paragraphStyle = xmlUtils?.getChildrenByLocalName(paragraphProperties, "pStyle")[0] || null;
    const styleId = paragraphStyle?.getAttribute("w:val") || paragraphStyle?.getAttribute("val") || "";
    if (styleId) {
      const directLevel = isHeadingName(styleId);
      if (directLevel) return directLevel;
      const chain = stylesParser?.resolveStyleChain(styles, styleId) || [];
      for (const style of chain) {
        const nameLevel = isHeadingName(style.name) || isHeadingName(style.styleId);
        if (nameLevel) return nameLevel;
        if (style.outlineLevel !== null) return Math.min(style.outlineLevel + 1, 6);
      }
    }
    const outlineLevel = xmlUtils?.getChildrenByLocalName(paragraphProperties, "outlineLvl")[0] || null;
    const value = outlineLevel?.getAttribute("w:val") || outlineLevel?.getAttribute("val") || "";
    const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
    return Number.isFinite(parsed) ? Math.min(parsed + 1, 6) : null;
  }

  function getListMetadata(
    paragraph: Element,
    numbering: {
      abstractNums: Map<string, { abstractNumId: string; levels: Map<number, { level: number; format: string; text: string }> }>;
      nums: Map<string, string>;
    }
  ): { listKind: "bullet" | "ordered"; indent: number } | null {
    const paragraphProperties = xmlUtils?.getChildrenByLocalName(paragraph, "pPr")[0] || null;
    if (!paragraphProperties) return null;
    const numberingProperties = xmlUtils?.getChildrenByLocalName(paragraphProperties, "numPr")[0] || null;
    if (!numberingProperties) return null;
    const numIdElement = xmlUtils?.getChildrenByLocalName(numberingProperties, "numId")[0] || null;
    const ilvlElement = xmlUtils?.getChildrenByLocalName(numberingProperties, "ilvl")[0] || null;
    const numId = numIdElement?.getAttribute("w:val") || numIdElement?.getAttribute("val") || "";
    const indent = Number.parseInt(ilvlElement?.getAttribute("w:val") || ilvlElement?.getAttribute("val") || "0", 10);
    if (!numId) return null;
    const listKind = numberingParser?.resolveListKind(numbering, numId, Number.isFinite(indent) ? indent : 0) || null;
    if (!listKind) return null;
    return {
      listKind,
      indent: Number.isFinite(indent) ? indent : 0
    };
  }

  function getGridSpan(cell: Element): number {
    const cellProperties = xmlUtils?.getChildrenByLocalName(cell, "tcPr")[0] || null;
    const gridSpan = cellProperties ? (xmlUtils?.getChildrenByLocalName(cellProperties, "gridSpan")[0] || null) : null;
    const value = gridSpan?.getAttribute("w:val") || gridSpan?.getAttribute("val") || "1";
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  function getVerticalMergeState(cell: Element): "restart" | "continue" | null {
    const cellProperties = xmlUtils?.getChildrenByLocalName(cell, "tcPr")[0] || null;
    const verticalMerge = cellProperties ? (xmlUtils?.getChildrenByLocalName(cellProperties, "vMerge")[0] || null) : null;
    if (!verticalMerge) return null;
    const value = verticalMerge.getAttribute("w:val") || verticalMerge.getAttribute("val") || "";
    if (!value || value === "continue") return "continue";
    if (value === "restart") return "restart";
    return null;
  }

  function extractCellText(
    cell: Element,
    relationships: Map<string, { target: string; type: string; mode: string }>,
    numbering: {
      abstractNums: Map<string, { abstractNumId: string; levels: Map<number, { level: number; format: string; text: string }> }>;
      nums: Map<string, string>;
    },
    context: ParseContext
  ): string {
    const paragraphs = xmlUtils?.getChildrenByLocalName(cell, "p") || [];
    const parts = paragraphs
      .map((paragraph) => renderCellParagraph(paragraph, relationships, numbering, context))
      .filter((text) => !!text);
    return parts.join("<br><br>").trim();
  }

  function renderCellParagraph(
    paragraph: Element,
    relationships: Map<string, { target: string; type: string; mode: string }>,
    numbering: {
      abstractNums: Map<string, { abstractNumId: string; levels: Map<number, { level: number; format: string; text: string }> }>;
      nums: Map<string, string>;
    },
    context: ParseContext
  ): string {
    const text = extractTextRuns(paragraph, relationships, context);
    if (!text) return "";
    const listMetadata = getListMetadata(paragraph, numbering);
    if (!listMetadata) {
      return text;
    }
    const indent = "&nbsp;&nbsp;&nbsp;&nbsp;".repeat(Math.max(0, listMetadata.indent));
    const marker = listMetadata.listKind === "ordered" ? "1." : "-";
    return `${indent}${marker} ${text}`;
  }

  function parseTableElement(
    table: Element,
    relationships: Map<string, { target: string; type: string; mode: string }>,
    numbering: {
      abstractNums: Map<string, { abstractNumId: string; levels: Map<number, { level: number; format: string; text: string }> }>;
      nums: Map<string, string>;
    },
    context: ParseContext
  ): ParsedTable {
    const rows: string[][] = [];
    for (const rowElement of xmlUtils?.getChildrenByLocalName(table, "tr") || []) {
      const row: string[] = [];
      for (const cellElement of xmlUtils?.getChildrenByLocalName(rowElement, "tc") || []) {
        const span = getGridSpan(cellElement);
        const verticalMergeState = getVerticalMergeState(cellElement);
        const text = extractCellText(cellElement, relationships, numbering, context);
        if (verticalMergeState === "continue") {
          for (let index = 0; index < span; index += 1) {
            row.push(index === 0 ? "↑M↑" : "←M←");
          }
          continue;
        }
        row.push(text);
        for (let index = 1; index < span; index += 1) {
          row.push("←M←");
        }
      }
      rows.push(row);
    }

    const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
    for (const row of rows) {
      while (row.length < columnCount) {
        row.push("");
      }
    }

    return {
      kind: "table",
      rows
    };
  }

  function parseDocumentXml(
    documentXmlBytes: Uint8Array,
    relationshipsBytes?: Uint8Array,
    stylesBytes?: Uint8Array,
    numberingBytes?: Uint8Array
  ): ParsedDocument {
    const document = xmlUtils?.parseXml(documentXmlBytes);
    const body = document ? xmlUtils?.findDescendantsByLocalName(document, "body")[0] : null;
    const relationships = relationshipsBytes ? relsParser?.parseRelationships(relationshipsBytes, "word/document.xml") || new Map() : new Map();
    const styles = stylesParser?.parseStyles(stylesBytes) || new Map();
    const numbering = numberingParser?.parseNumbering(numberingBytes) || { abstractNums: new Map(), nums: new Map() };
    const summary: ParsedSummary = {
      paragraphs: 0,
      headings: 0,
      listItems: 0,
      tables: 0,
      links: 0,
      internalLinks: 0,
      externalLinks: 0,
      unsupportedElements: 0
    };
    const context: ParseContext = { summary };
    const blocks: Array<ParsedParagraph | ParsedTable | ParsedUnsupported> = [];
    if (!body) {
      return { blocks, summary };
    }
    for (const child of Array.from(body.childNodes || [])) {
      if (child.nodeType !== 1) continue;
      const element = child as Element;
      if (element.localName === "p") {
        const text = extractTextRuns(element, relationships, context);
        const level = getHeadingLevel(element, styles);
        const listMetadata = getListMetadata(element, numbering);
        if (text) {
          const anchorIds = extractParagraphAnchors(element);
          if (listMetadata) {
            summary.listItems += 1;
          } else if (level) {
            summary.headings += 1;
          } else {
            summary.paragraphs += 1;
          }
          blocks.push({
            kind: listMetadata ? "listItem" : (level ? "heading" : "paragraph"),
            text,
            level: level || undefined,
            listKind: listMetadata?.listKind,
            indent: listMetadata?.indent,
            anchorIds
          });
      }
    } else if (element.localName === "tbl") {
        summary.tables += 1;
        blocks.push(parseTableElement(element, relationships, numbering, context));
      } else {
        blocks.push(recordUnsupported(context, element.localName || "unknown"));
      }
    }
    return { blocks, summary };
  }

  moduleRegistry.registerModule("documentParser", {
    parseDocumentXml
  });
})();
