/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const xmlUtils = moduleRegistry.getModule<{
    getChildrenByLocalName: (parent: ParentNode, localName: string) => Element[];
  }>("xmlUtils");
  const documentDrawingParser = moduleRegistry.getModule<{
    describeUnsupportedElement: (
      element: Element,
      relationships: Map<string, Docx2mdRelationship>
    ) => string;
  }>("documentDrawingParser");
  const documentAnchorParser = moduleRegistry.getModule<{
    extractParagraphAnchors: (paragraph: Element) => string[];
    claimUniqueAnchorIds: (anchorIds: string[], emittedAnchorIds: Set<string>) => string[];
  }>("documentAnchorParser");
  const documentTableParser = moduleRegistry.getModule<{
    parseTableElement: (
      table: Element,
      extractCellText: (cell: Element, tableUnsupportedTypes: string[]) => string
    ) => ParsedTable;
  }>("documentTableParser");
  const documentCellParser = moduleRegistry.getModule<{
    extractCellText: (
      cell: Element,
      relationships: Map<string, Docx2mdRelationship>,
      styles: Map<string, Docx2mdParsedStyleDefinition>,
      numbering: Docx2mdNumberingDefinition,
      context: Docx2mdParseContext,
      tableUnsupportedTypes: string[]
    ) => string;
  }>("documentCellParser");
  const documentInlineParser = moduleRegistry.getModule<{
    getParagraphTextStyle: (
      paragraph: Element,
      styles: Map<string, Docx2mdParsedStyleDefinition>
    ) => Docx2mdParsedStyle;
    extractTextRuns: (
      paragraph: Element,
      relationships: Map<string, Docx2mdRelationship>,
      styles: Map<string, Docx2mdParsedStyleDefinition>,
      numbering: Docx2mdNumberingDefinition,
      context: Docx2mdParseContext,
      unsupportedTypes: string[],
      renderStructuredParagraphText: Docx2mdStructuredParagraphRenderer,
      inheritedStyle?: Docx2mdParsedStyle,
      suppressUnderline?: boolean
    ) => string;
  }>("documentInlineParser");
  const documentParagraphParser = moduleRegistry.getModule<{
    getHeadingLevel: (
      paragraph: Element,
      styles: Map<string, Docx2mdParsedStyleDefinition>
    ) => number | null;
    getListMetadata: (
      paragraph: Element,
      numbering: Docx2mdNumberingDefinition
    ) => { listKind: "bullet" | "ordered"; indent: number } | null;
    renderStructuredParagraphText: (
      paragraph: Element,
      text: string,
      styles: Map<string, Docx2mdParsedStyleDefinition>,
      numbering: Docx2mdNumberingDefinition,
      unsupportedTypes: string[]
    ) => string;
  }>("documentParagraphParser");
  const documentSummary = moduleRegistry.getModule<{
    createEmptySummary: () => Docx2mdParsedSummary;
    recordUnsupportedSummary: (summary: Docx2mdParsedSummary, type: string) => void;
  }>("documentSummary");

  type ParsedParagraph = Extract<Docx2mdParsedBlock, { kind: "paragraph" | "heading" | "listItem" }>;
  type ParsedTable = Extract<Docx2mdParsedBlock, { kind: "table" }>;
  type ParsedUnsupported = Extract<Docx2mdParsedBlock, { kind: "unsupported" }>;

  function recordUnsupported(context: Docx2mdParseContext, type: string): ParsedUnsupported {
    documentSummary?.recordUnsupportedSummary(context.summary, type);
    return {
      kind: "unsupported",
      type
    };
  }

  function describeUnsupportedElement(
    element: Element,
    relationships: Map<string, Docx2mdRelationship>
  ): string {
    return documentDrawingParser?.describeUnsupportedElement(element, relationships)
      || (element.localName || "unknown");
  }

  function extractParagraphAnchors(paragraph: Element): string[] {
    return documentAnchorParser?.extractParagraphAnchors(paragraph) || [];
  }

  function claimUniqueAnchorIds(anchorIds: string[], emittedAnchorIds: Set<string>): string[] {
    return documentAnchorParser?.claimUniqueAnchorIds(anchorIds, emittedAnchorIds) || [];
  }

  function getHeadingLevel(paragraph: Element, styles: Map<string, Docx2mdParsedStyleDefinition>): number | null {
    return documentParagraphParser?.getHeadingLevel(paragraph, styles) || null;
  }

  function getListMetadata(
    paragraph: Element,
    numbering: Docx2mdNumberingDefinition
  ): { listKind: "bullet" | "ordered"; indent: number } | null {
    return documentParagraphParser?.getListMetadata(paragraph, numbering) || null;
  }

  function renderStructuredParagraphText(
    paragraph: Element,
    text: string,
    styles: Map<string, Docx2mdParsedStyleDefinition>,
    numbering: Docx2mdNumberingDefinition,
    unsupportedTypes: string[]
  ): string {
    return documentParagraphParser?.renderStructuredParagraphText(paragraph, text, styles, numbering, unsupportedTypes) || text;
  }

  function requireDocumentSummary() {
    if (!documentSummary) {
      throw new Error("DOCX document summary module is not loaded.");
    }
    return documentSummary;
  }

  function parseTableElement(
    table: Element,
    relationships: Map<string, Docx2mdRelationship>,
    styles: Map<string, Docx2mdParsedStyleDefinition>,
    numbering: Docx2mdNumberingDefinition,
    context: Docx2mdParseContext
  ): ParsedTable {
    return documentTableParser?.parseTableElement(
      table,
      (cell: Element, tableUnsupportedTypes: string[]) => documentCellParser?.extractCellText(
        cell,
        relationships,
        styles,
        numbering,
        context,
        tableUnsupportedTypes
      ) || ""
    ) || { kind: "table", rows: [] };
  }

  function collectKnownAnchorIds(body: Element): Set<string> {
    const knownAnchorIds = new Set<string>();
    for (const paragraphElement of xmlUtils?.getChildrenByLocalName(body, "p") || []) {
      for (const anchorId of extractParagraphAnchors(paragraphElement)) {
        knownAnchorIds.add(anchorId);
      }
    }
    return knownAnchorIds;
  }

  function parseParagraphBlock(
    element: Element,
    relationships: Map<string, Docx2mdRelationship>,
    styles: Map<string, Docx2mdParsedStyleDefinition>,
    numbering: Docx2mdNumberingDefinition,
    context: Docx2mdParseContext,
    emittedAnchorIds: Set<string>
  ): ParsedParagraph | null {
    const unsupportedTypes: string[] = [];
    const text = documentInlineParser?.extractTextRuns(
      element,
      relationships,
      styles,
      numbering,
      context,
      unsupportedTypes,
      renderStructuredParagraphText,
      documentInlineParser.getParagraphTextStyle(element, styles)
    ) || "";
    const level = getHeadingLevel(element, styles);
    const listMetadata = getListMetadata(element, numbering);
    if (!text) return null;

    const anchorIds = claimUniqueAnchorIds(extractParagraphAnchors(element), emittedAnchorIds);
    if (listMetadata) {
      context.summary.listItems += 1;
    } else if (level) {
      context.summary.headings += 1;
    } else {
      context.summary.paragraphs += 1;
    }
    return {
      kind: listMetadata ? "listItem" : (level ? "heading" : "paragraph"),
      text,
      level: level || undefined,
      listKind: listMetadata?.listKind,
      indent: listMetadata?.indent,
      anchorIds,
      unsupportedTypes: unsupportedTypes.length ? unsupportedTypes : undefined
    };
  }

  function parseBodyElement(
    element: Element,
    relationships: Map<string, Docx2mdRelationship>,
    styles: Map<string, Docx2mdParsedStyleDefinition>,
    numbering: Docx2mdNumberingDefinition,
    context: Docx2mdParseContext,
    emittedAnchorIds: Set<string>
  ): Docx2mdParsedBlock | null {
    if (element.localName === "p") {
      return parseParagraphBlock(element, relationships, styles, numbering, context, emittedAnchorIds);
    }
    if (element.localName === "tbl") {
      context.summary.tables += 1;
      return parseTableElement(element, relationships, styles, numbering, context);
    }
    return recordUnsupported(context, describeUnsupportedElement(element, relationships));
  }

  function parseDocumentBody(
    body: Element | null,
    relationships: Map<string, Docx2mdRelationship>,
    styles: Map<string, Docx2mdParsedStyleDefinition>,
    numbering: Docx2mdNumberingDefinition
  ): Docx2mdParsedDocument {
    const summary = requireDocumentSummary().createEmptySummary();
    const blocks: Array<ParsedParagraph | ParsedTable | ParsedUnsupported> = [];
    if (!body) {
      return { blocks, summary };
    }

    const emittedAnchorIds = new Set<string>();
    const context: Docx2mdParseContext = {
      summary,
      knownAnchorIds: collectKnownAnchorIds(body)
    };
    for (const child of Array.from(body.childNodes || []) as Node[]) {
      if (child.nodeType !== 1) continue;
      const element = child as Element;
      const block = parseBodyElement(element, relationships, styles, numbering, context, emittedAnchorIds);
      if (block) {
        blocks.push(block);
      }
    }
    return { blocks, summary };
  }

  moduleRegistry.registerModule("documentBlockParser", {
    parseDocumentBody
  });
})();
